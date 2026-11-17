/**
 * HawkPath AI — server-side agent.
 *
 * Design rule: the LLM never computes a schedule. Every number it reports comes
 * from a deterministic tool (topological scheduler, critical-path DP, DAG
 * reachability) that also powers the on-screen graph.
 *
 * Security: the API key lives only in server env; client input is schema-validated
 * and size-capped; per-IP token bucket + global daily budget; bounded agent loop.
 */
import type { Content, FunctionDeclaration } from '@google/genai';
import { StudentProfile, CompletedCourseRecord } from '../src/types/index.js';
import { ARTICULATION_TARGETS } from '../src/data/articulationAgreements.js';
import { COURSE_MAP } from '../src/data/crcCurriculum.js';
import {
  Scenario, runScenario, summarizeSim, downstreamOf, upstreamOf,
  normalizeCourseCode, isKnownCourse, termIndex, getTarget,
} from '../src/utils/scenario.js';
import { takeToken } from './ratelimit.js';
import { verifyUser } from './auth.js';
import { apiKey, generate, describeError } from './gemini.js';
import { groq, groqKey, groqModels, isGroqTransient, describeGroqError } from './groq.js';
import type Groq from 'groq-sdk';
import { outcomesForTarget, describeOutcomes } from './scorecard.js';

const MAX_AGENT_STEPS = 6;
const MAX_HISTORY = 16;
const MAX_MSG_CHARS = 1500;

// ---------------------------------------------------------------- validation
class ValidationError extends Error {}

const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);

const clampNum = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
};

const GRADES = new Set(['A', 'B', 'C', 'D', 'F', 'IP', 'CR']);
const TARGET_IDS = new Set(ARTICULATION_TARGETS.map(t => t.id));

function validateProfile(raw: any): StudentProfile {
  if (!raw || typeof raw !== 'object') throw new ValidationError('profile missing');
  if (!Array.isArray(raw.completedCourses) || raw.completedCourses.length > 60)
    throw new ValidationError('completedCourses invalid');
  const completedCourses: CompletedCourseRecord[] = raw.completedCourses
    .map((c: any) => ({
      courseCode: normalizeCourseCode(clean(c?.courseCode, 12)),
      grade: GRADES.has(c?.grade) ? c.grade : 'IP',
      term: clean(c?.term, 30),
      units: clampNum(c?.units, 0, 6, 3),
    }))
    .filter((c: CompletedCourseRecord) => /^[A-Z]{3,5} \d{3}$/.test(c.courseCode));
  return {
    id: clean(raw.id, 40),
    name: clean(raw.name, 60) || 'Student',
    studentId: clean(raw.studentId, 12),
    college: 'Cosumnes River College',
    major: clean(raw.major, 80),
    targetUniversity: TARGET_IDS.has(raw.targetUniversity) ? raw.targetUniversity : ARTICULATION_TARGETS[0].id,
    completedCourses,
    targetUnitsPerTerm: clampNum(raw.targetUnitsPerTerm, 6, 21, 14),
    workingHoursPerWeek: clampNum(raw.workingHoursPerWeek, 0, 60, 0),
    isMesaStudent: Boolean(raw.isMesaStudent),
    notes: clean(raw.notes, 200),
  };
}

function validateScenario(raw: any): Scenario {
  if (!raw || typeof raw !== 'object') return {};
  const codes = (v: unknown) =>
    Array.isArray(v) ? v.slice(0, 8).map(x => normalizeCourseCode(clean(x, 12))).filter(isKnownCourse) : undefined;
  return {
    label: raw.label ? clean(raw.label, 60) : undefined,
    targetId: TARGET_IDS.has(raw.targetId) ? raw.targetId : undefined,
    workHours: raw.workHours == null ? undefined : clampNum(raw.workHours, 0, 60, 0),
    unitsPerTerm: raw.unitsPerTerm == null ? undefined : clampNum(raw.unitsPerTerm, 6, 21, 14),
    failCourses: codes(raw.failCourses),
    completeCourses: codes(raw.completeCourses),
  };
}

interface ChatTurn { role: 'user' | 'assistant'; text: string }

function validateMessages(raw: any): ChatTurn[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new ValidationError('messages required');
  const msgs = raw.slice(-MAX_HISTORY).map((m: any) => {
    if (m?.role !== 'user' && m?.role !== 'assistant') throw new ValidationError('bad role');
    const text = clean(m.content, MAX_MSG_CHARS).trim();
    if (!text) throw new ValidationError('empty message');
    return { role: m.role, text } as ChatTurn;
  });
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw new ValidationError('last message must be from user');
  return msgs;
}

// ---------------------------------------------------------------- tools
const scenarioProps = {
  target_id: { type: 'string', enum: [...TARGET_IDS], description: 'Transfer target id. Omit to use the current one.' },
  work_hours: { type: 'integer', minimum: 0, maximum: 60, description: 'Hours/week of paid work.' },
  units_per_term: { type: 'integer', minimum: 6, maximum: 21, description: 'Desired units per term.' },
  fail_courses: { type: 'array', items: { type: 'string' }, description: 'Course codes the student fails or withdraws from, e.g. ["CISP 400"].' },
  complete_courses: { type: 'array', items: { type: 'string' }, description: 'Course codes the student finishes early (e.g. in summer).' },
} as const;

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'simulate_what_if',
    description:
      'Run the deterministic prerequisite scheduler (topological sort + critical-path DP) for a hypothetical scenario and compare it to the student\'s current baseline plan. Use for ANY question about delays, failing/dropping a class, work hours, unit load, or switching schools. Returns projected transfer term, term-by-term plan and the delay versus baseline.',
    parametersJsonSchema: { type: 'object', properties: scenarioProps },
  },
  {
    name: 'get_course_dependencies',
    description:
      'Look up one course in the prerequisite DAG: direct prerequisites, full upstream chain, every downstream course it unlocks (transitive), terms offered, units, and the student\'s status in it.',
    parametersJsonSchema: {
      type: 'object',
      properties: { course_code: { type: 'string', description: 'e.g. "CISP 430"' } },
      required: ['course_code'],
    },
  },
  {
    name: 'compare_transfer_targets',
    description:
      'Score every supported transfer target (UC Davis, Sac State, UC Berkeley, etc.) for this student: projected transfer term, major-prep completeness, GPA versus minimum/competitive GPA, plus real federal outcome data (net price, graduation rate, median debt, earnings).',
    parametersJsonSchema: {
      type: 'object',
      properties: { work_hours: scenarioProps.work_hours, units_per_term: scenarioProps.units_per_term },
    },
  },
  {
    name: 'get_school_outcomes',
    description:
      'Live U.S. Department of Education College Scorecard data for a transfer school: average net price per year, graduation rate, median debt, median earnings 10 years after entry, Pell grant share. Use for cost, affordability, debt, earnings or "is it worth it" questions.',
    parametersJsonSchema: {
      type: 'object',
      properties: { target_id: scenarioProps.target_id },
    },
  },
  {
    name: 'show_scenario_on_dashboard',
    description:
      'Push a scenario onto the student\'s live dashboard so the prerequisite graph and semester plan redraw. Call this after simulate_what_if whenever the student asks to see, show, apply, or try a scenario.',
    parametersJsonSchema: {
      type: 'object',
      properties: { label: { type: 'string', description: 'Short label, e.g. "Fail CISP 400 + 30h work"' }, ...scenarioProps },
      required: ['label'],
    },
  },
];

function toScenario(input: any, base: Scenario): Scenario {
  return validateScenario({
    ...base,
    label: input.label ?? base.label,
    targetId: input.target_id ?? base.targetId,
    workHours: input.work_hours ?? base.workHours,
    unitsPerTerm: input.units_per_term ?? base.unitsPerTerm,
    failCourses: input.fail_courses ?? base.failCourses,
    completeCourses: input.complete_courses ?? base.completeCourses,
  });
}

interface ToolCtx { profile: StudentProfile; scenario: Scenario; uiActions: { type: 'apply_scenario'; scenario: Scenario }[] }

async function runTool(name: string, input: any, ctx: ToolCtx): Promise<unknown> {
  switch (name) {
    case 'simulate_what_if': {
      const baseline = runScenario(ctx.profile, ctx.scenario);
      const what = runScenario(ctx.profile, toScenario(input, ctx.scenario));
      const delta = termIndex(what.sim.graduationTerm) - termIndex(baseline.sim.graduationTerm);
      return {
        baseline: { target: baseline.target.universityName, projectedTransferTerm: baseline.sim.graduationTerm, gpa: baseline.gpa },
        whatIf: {
          target: `${what.target.universityName} — ${what.target.majorName}`,
          gpa: what.gpa,
          minTransferGPA: what.target.minTransferGPA,
          competitiveGPA: what.target.competitiveGPA,
          effectiveUnitCap: Math.min(what.profile.targetUnitsPerTerm, what.profile.workingHoursPerWeek >= 30 ? 10 : what.profile.workingHoursPerWeek >= 25 ? 12 : 99),
          ...summarizeSim(what.sim),
        },
        delayInTerms: delta,
        verdict: delta > 0 ? `Transfer slips ${delta} term(s)` : delta < 0 ? `Transfer moves up ${-delta} term(s)` : 'No change to transfer term',
      };
    }
    case 'get_course_dependencies': {
      const code = normalizeCourseCode(clean(input.course_code, 12));
      const c = COURSE_MAP.get(code);
      if (!c) return { error: `Unknown course ${code}. Known: ${[...COURSE_MAP.keys()].join(', ')}` };
      const rec = ctx.profile.completedCourses.find(r => r.courseCode === code);
      return {
        code, title: c.title, description: c.description, units: c.units, termsOffered: c.termsOffered, minGrade: c.minGrade ?? 'C',
        onYourCriticalPath: runScenario(ctx.profile, ctx.scenario).sim.criticalPathCourses.includes(code),
        requiredForMajorPrepAt: ARTICULATION_TARGETS.filter(t => t.requiredMajorCourses.includes(code)).map(t => `${t.universityName} ${t.majorName}`),
        directPrerequisites: c.prerequisites,
        fullPrerequisiteChain: upstreamOf(code),
        unlocksDownstream: downstreamOf(code),
        studentStatus: rec ? (rec.grade === 'IP' ? 'in progress' : `completed with ${rec.grade}`) : 'not taken',
      };
    }
    case 'compare_transfer_targets': {
      const s = toScenario(input, ctx.scenario);
      return Promise.all(ARTICULATION_TARGETS.map(async t => {
        const r = runScenario(ctx.profile, { ...s, targetId: t.id });
        return {
          id: t.id, school: `${t.universityName} — ${t.majorName}`,
          projectedTransferTerm: r.sim.graduationTerm, termsRemaining: r.sim.semesters.length,
          majorPrepCompleteness: `${r.sim.majorPrepCompleteness}%`,
          gpa: r.gpa, minTransferGPA: t.minTransferGPA, competitiveGPA: t.competitiveGPA,
          gpaStatus: r.gpa >= t.competitiveGPA ? 'competitive' : r.gpa >= t.minTransferGPA ? 'eligible, below competitive' : 'below minimum',
          outcomes: describeOutcomes(await outcomesForTarget(t.id)),
        };
      }));
    }
    case 'get_school_outcomes': {
      const id = TARGET_IDS.has(input.target_id) ? input.target_id : (ctx.scenario.targetId ?? ctx.profile.targetUniversity);
      return describeOutcomes(await outcomesForTarget(id)) ?? { error: 'Outcome data temporarily unavailable.' };
    }
    case 'show_scenario_on_dashboard': {
      const s = toScenario(input, ctx.scenario);
      ctx.uiActions.push({ type: 'apply_scenario', scenario: s });
      const r = runScenario(ctx.profile, s);
      return { shown: true, label: s.label, projectedTransferTerm: r.sim.graduationTerm };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}

function systemPrompt(profile: StudentProfile, scenario: Scenario): string {
  const target = getTarget(scenario.targetId ?? profile.targetUniversity);
  return `You are HawkPath, a transfer and prerequisite advisor for Cosumnes River College (CRC) students, built for the MESA program (first-generation, working, underrepresented STEM students).

Hard rules:
- Never invent schedules, terms, delays, GPAs or course data. Get every number from a tool call, and say the numbers the tool returned.
- For cost, debt, earnings or graduation-rate questions, call get_school_outcomes (real federal data) and say it comes from the College Scorecard.
- For any "what if" question, call simulate_what_if AND show_scenario_on_dashboard in the same turn (the student is looking at their live dashboard, so always show the scenario).
- Only state facts that appear in tool results. Do not add claims about admissions committees, policies, other courses or anything the tools did not return. If a tool result is empty (e.g. a course unlocks nothing else in this catalog), say exactly that.
- Never estimate a delay or a term without calling simulate_what_if first.
- If a course or school is not in the tools' data, say so plainly.
- Replies are often read aloud: 2-5 short sentences, plain language, no markdown tables, no headers. Bold at most one key number with **.
- End with one concrete next step (e.g. talk to a MESA counselor, a summer option).
- You are a planning aid, not an official degree audit; mention that only when the stakes are high (e.g. a failed class).

Student: ${profile.name}${profile.isMesaStudent ? ' (MESA scholar)' : ''}, ${profile.major}.
Works ${profile.workingHoursPerWeek} h/week, wants ${profile.targetUnitsPerTerm} units/term.
Current target: ${target.universityName} — ${target.majorName} (min GPA ${target.minTransferGPA}, competitive ${target.competitiveGPA}).
Record: ${profile.completedCourses.map(c => `${c.courseCode}:${c.grade}`).join(', ') || 'none'}.
Active dashboard scenario: ${scenario.label ? JSON.stringify(scenario) : 'baseline (no what-if applied)'}.
Planning starts Spring 2027 (two full terms per year).`;
}

// ---------------------------------------------------------------- offline fallback
async function offlineAnswer(question: string, ctx: ToolCtx) {
  const q = question.toLowerCase();
  const fail = [...new Set((q.match(/[a-z]{3,5}\s*-?\s*\d{3}/g) ?? []).map(normalizeCourseCode).filter(isKnownCourse))];
  const hours = q.match(/(\d{1,2})\s*(h|hour|hrs)/)?.[1];
  const input: any = {};
  if (fail.length && /fail|drop|withdraw|retake/.test(q)) input.fail_courses = fail;
  if (hours) input.work_hours = Number(hours);
  const name = 'simulate_what_if';
  const result: any = await runTool(name, input, ctx);
  const text = `Offline mode (AI unavailable, deterministic engine only): ${result.verdict}. ` +
    `Projected transfer: **${result.whatIf.projectedTransferTerm}** for ${result.whatIf.target}, ` +
    `critical path ${result.whatIf.criticalPath.join(' → ')}.`;
  return { text, trace: [{ tool: name, input, output: result, ms: 0 }] };
}

// ---------------------------------------------------------------- handler
export interface AdvisorResult { status: number; body: Record<string, unknown>; headers?: Record<string, string> }

type Trace = { tool: string; input: unknown; output: unknown; ms: number; error?: boolean }[];
interface LoopResult { reply: string; model: string; usage: { input: number; output: number } }

async function execTool(name: string, args: any, ctx: ToolCtx, trace: Trace): Promise<unknown> {
  const t0 = performance.now();
  try {
    const output = await runTool(name, args ?? {}, ctx);
    trace.push({ tool: name, input: args ?? {}, output, ms: Math.round(performance.now() - t0) });
    return output;
  } catch (err) {
    trace.push({ tool: name, input: args ?? {}, output: String(err), ms: 0, error: true });
    return { error: `Tool failed: ${String(err)}` };
  }
}

const REFUSAL = "I can't help with that one. Try asking about your classes, prerequisites or transfer timeline.";

// ---------------------------------------------------------------- provider: Groq (primary)
const GROQ_TOOLS: Groq.Chat.ChatCompletionTool[] = TOOLS.map(t => ({
  type: 'function',
  function: { name: String(t.name), description: t.description, parameters: t.parametersJsonSchema as Record<string, unknown> },
}));

async function runGroq(history: ChatTurn[], system: string, ctx: ToolCtx, trace: Trace, started: number): Promise<LoopResult> {
  const usage = { input: 0, output: 0 };
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role, content: m.text }) as Groq.Chat.ChatCompletionMessageParam),
  ];
  const models = groqModels();
  let mi = 0;
  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    if (Date.now() - started > 45_000) throw new Error('Agent time budget exceeded (timeout)');
    let res: Groq.Chat.ChatCompletion;
    for (;;) {
      try {
        res = await groq().chat.completions.create({
          model: models[mi], messages, tools: GROQ_TOOLS, tool_choice: 'auto', parallel_tool_calls: true,
          temperature: 0.2, max_completion_tokens: 1500,
        });
        break;
      } catch (e) {
        if (isGroqTransient(e) && mi < models.length - 1) { console.warn(`[groq] ${models[mi]}: ${describeGroqError(e)}, trying next model`); mi++; continue; }
        throw e;
      }
    }
    usage.input += res.usage?.prompt_tokens ?? 0;
    usage.output += res.usage?.completion_tokens ?? 0;
    const msg = res.choices[0]?.message;
    if (!msg) throw new Error('Groq returned no choices');
    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) return { reply: (msg.content ?? '').trim() || 'Done.', model: res.model, usage };

    messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: calls });
    const outputs = await Promise.all(calls.map(async tc => {
      let args: any = {};
      try { args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { args = {}; }
      return { id: tc.id, output: await execTool(tc.function.name, args, ctx, trace) };
    }));
    for (const o of outputs) messages.push({ role: 'tool', tool_call_id: o.id, content: JSON.stringify(o.output) });
  }
  return { reply: 'I ran out of reasoning steps. Try a narrower question.', model: models[mi], usage };
}

// ---------------------------------------------------------------- provider: Gemini (backup)
async function runGemini(history: ChatTurn[], system: string, ctx: ToolCtx, trace: Trace, started: number): Promise<LoopResult> {
  const usage = { input: 0, output: 0 };
  const contents: Content[] = history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] }));
  let lastModel = '';
  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    if (Date.now() - started > 50_000) throw new Error('Agent time budget exceeded (timeout)');
    const { res, model } = await generate({
      contents,
      config: { systemInstruction: system, tools: [{ functionDeclarations: TOOLS }], temperature: 0.3, maxOutputTokens: 2048 },
    });
    lastModel = model;
    usage.input += res.usageMetadata?.promptTokenCount ?? 0;
    usage.output += res.usageMetadata?.candidatesTokenCount ?? 0;
    const candidate = res.candidates?.[0];
    if (!candidate?.content || res.promptFeedback?.blockReason || candidate.finishReason === 'SAFETY') return { reply: REFUSAL, model, usage };
    const calls = res.functionCalls ?? [];
    if (calls.length === 0) return { reply: (res.text ?? '').trim() || 'Done.', model, usage };
    contents.push(candidate.content); // keep model turn verbatim (thought signatures)
    contents.push({
      role: 'user',
      parts: await Promise.all(calls.map(async fc => {
        const name = String(fc.name ?? '');
        const output = await execTool(name, fc.args, ctx, trace);
        return { functionResponse: { id: fc.id, name, response: { output } } };
      })),
    });
  }
  return { reply: 'I ran out of reasoning steps. Try a narrower question.', model: lastModel, usage };
}

// ---------------------------------------------------------------- handler
export async function handleAdvisor(rawBody: unknown, clientIp: string, authHeader?: string | null): Promise<AdvisorResult> {
  const started = Date.now();
  const user = await verifyUser(authHeader);
  const gate = user ? takeToken(user.userId, 'advisor', 'member') : takeToken(clientIp || 'unknown', 'advisor', 'guest');
  if (!gate.ok) {
    return {
      status: 429,
      headers: { 'Retry-After': String(gate.retryAfter) },
      body: { error: `Rate limit reached. Try again in ${gate.retryAfter}s.`, retryAfter: gate.retryAfter, tier: user ? 'member' : 'guest' },
    };
  }

  let ctx: ToolCtx;
  let history: ChatTurn[];
  try {
    const body = (rawBody ?? {}) as any;
    ctx = { profile: validateProfile(body.profile), scenario: validateScenario(body.scenario), uiActions: [] };
    history = validateMessages(body.messages);
  } catch (e) {
    if (e instanceof ValidationError) return { status: 400, body: { error: `Invalid request: ${e.message}` } };
    throw e;
  }
  const lastQuestion = history[history.length - 1].text;
  const system = systemPrompt(ctx.profile, ctx.scenario);

  const providers: { name: 'Groq' | 'Gemini'; run: typeof runGroq; describe: (e: unknown) => string }[] = [];
  if (groqKey()) providers.push({ name: 'Groq', run: runGroq, describe: describeGroqError });
  if (apiKey()) providers.push({ name: 'Gemini', run: runGemini, describe: describeError });

  if (!providers.length) {
    const off = await offlineAnswer(lastQuestion, ctx);
    return { status: 200, body: { mode: 'offline', reply: off.text, trace: off.trace, uiActions: [], ms: Date.now() - started } };
  }

  const failures: string[] = [];
  for (const p of providers) {
    const trace: Trace = [];
    ctx.uiActions = []; // a failed attempt must not leave half-applied UI actions
    try {
      const r = await p.run(history, system, ctx, trace, started);
      return {
        status: 200,
        body: {
          mode: 'live', provider: p.name, model: r.model, reply: r.reply, trace, uiActions: ctx.uiActions,
          usage: r.usage, ms: Date.now() - started, ...(failures.length ? { failover: failures } : {}),
        },
      };
    } catch (err) {
      const reason = p.describe(err);
      failures.push(`${p.name}: ${reason}`);
      console.error(`[advisor] ${p.name} failed:`, reason, err instanceof Error ? err.message.slice(0, 300) : err);
    }
  }

  // Graceful degradation: the deterministic engine still answers.
  const off = await offlineAnswer(lastQuestion, ctx);
  return { status: 200, body: { mode: 'degraded', degradedReason: failures.join('; '), reply: off.text, trace: off.trace, uiActions: [], ms: Date.now() - started } };
}
