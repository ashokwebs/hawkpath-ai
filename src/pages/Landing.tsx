import React, { useState } from 'react';
import {
  Mic, GitBranch, ShieldCheck, FileText, Upload, Check, ArrowRight, Route, ChevronDown, Wrench,
  Gauge, Landmark, Users, TriangleExclamationPoint, Building2, Lock, Database, Sparkles, LineChart,
} from 'lucide-react';
import { Logo, LogoMark } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { useAuth } from '../lib/auth';
import { useSchools, fmtUSD, fmtPct } from '../lib/schools';
import { CRC_COURSES } from '../data/crcCurriculum';
import { ARTICULATION_TARGETS } from '../data/articulationAgreements';

const go = () => { window.location.hash = '#/app'; };
const PREREQ_LINKS = CRC_COURSES.reduce((n, c) => n + c.prerequisites.length, 0);

const Section: React.FC<{ id?: string; eyebrow?: string; title: string; sub?: string; children: React.ReactNode; tint?: boolean }> =
  ({ id, eyebrow, title, sub, children, tint }) => (
  <section id={id} className={tint ? 'bg-slate-50 border-y border-slate-200' : ''}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      {eyebrow && <div className="text-[13px] font-semibold text-blue-700">{eyebrow}</div>}
      <h2 className="mt-2 text-3xl sm:text-[34px] font-bold tracking-tight text-slate-900 max-w-3xl">{title}</h2>
      {sub && <p className="mt-3 text-lg text-slate-600 max-w-2xl leading-relaxed">{sub}</p>}
      <div className="mt-10">{children}</div>
    </div>
  </section>
);

const FAQ: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-4 text-left font-medium text-slate-900" aria-expanded={open}>
        {q}<ChevronDown className={`w-4 h-4 shrink-0 ml-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-[15px] text-slate-600 leading-relaxed">{a}</p>}
    </div>
  );
};

/** Static product preview (mirrors the real dashboard). */
const HeroPreview: React.FC = () => (
  <div className="relative">
    <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 via-white to-amber-50 rounded-3xl blur-2xl opacity-70" aria-hidden />
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="ml-3 text-[11px] text-slate-500">hawkpath · student plan</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[['Projected transfer', 'Fall 2028', 'text-red-600', '+1 term'], ['GPA vs target', '3.30', 'text-amber-600', 'min 3.4'], ['Major prep', '100%', 'text-slate-900', 'after plan']].map(([k, v, c, s]) => (
            <div key={k} className="rounded-lg border border-slate-200 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
              <div className={`text-lg font-bold ${c}`}>{v}</div>
              <div className="text-[10px] text-slate-500">{s}</div>
            </div>
          ))}
        </div>
        <svg viewBox="0 0 420 70" className="w-full" aria-hidden>
          {[['CISP 360', 4, '#16a34a', '#f0fdf4'], ['CISP 400', 110, '#dc2626', '#fef2f2'], ['CISP 430', 216, '#ea580c', '#fff7ed'], ['CISP 440', 322, '#cbd5e1', '#ffffff']].map(([t, x, c, f], i) => (
            <g key={i}>
              {i > 0 && <path d={`M ${Number(x) - 16} 35 L ${Number(x)} 35`} stroke={i < 3 ? '#ea580c' : '#94a3b8'} strokeWidth="2" className={i < 3 ? 'edge-critical' : ''} />}
              <rect x={Number(x)} y={14} width={94} height={42} rx={8} fill={f as string} stroke={c as string} strokeWidth="1.5" />
              <text x={Number(x) + 47} y={39} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0f172a" fontFamily="Fira Code, monospace">{t}</text>
            </g>
          ))}
        </svg>
        <div className="flex justify-end"><div className="rounded-lg px-3 py-2 text-[12.5px] bg-blue-600 text-white flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" />“What if I fail CISP 400 and work 30 hours?”</div></div>
        <div className="rounded-lg px-3 py-2 text-[12.5px] bg-slate-100 text-slate-800 leading-relaxed">
          Your transfer moves from Spring 2028 to <b>Fall 2028</b>, and your GPA would drop below UC Davis’s 3.4 minimum. A summer retake could win that term back.
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 font-mono"><Wrench className="w-3 h-3" />simulate_what_if → show_scenario_on_dashboard</div>
        </div>
      </div>
    </div>
  </div>
);

/** Clearly-labelled illustrative preview of the counselor product (sample data, not real students). */
const CounselorPreview: React.FC = () => {
  const cohort = [
    { n: 'Student A', goal: 'UC Davis CS', term: 'Spring 2028', risk: 'On track', tone: 'emerald' },
    { n: 'Student B', goal: 'Sac State CS', term: 'Fall 2027', risk: 'On track', tone: 'emerald' },
    { n: 'Student C', goal: 'UC Berkeley EECS', term: 'Fall 2028', risk: 'GPA below target', tone: 'amber' },
    { n: 'Student D', goal: 'SJSU Software Eng.', term: 'Spring 2029', risk: 'Failed prerequisite', tone: 'red' },
    { n: 'Student E', goal: 'UC Davis Data Sci.', term: 'Fall 2027', risk: 'Work hours > 25', tone: 'amber' },
  ];
  const bottlenecks = [['MATH 401', 72], ['CISP 400', 58], ['PHYS 411', 41], ['CISP 430', 33]] as const;
  const toneCls: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200', amber: 'bg-amber-50 text-amber-800 border-amber-200', red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <Building2 className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-900">Counselor workspace</span>
        <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Illustrative preview · example data</span>
      </div>
      <div className="p-5 grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 min-w-0">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Students', '240'], ['On track', '71%'], ['Need outreach', '18']].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-2.5"><div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div><div className="text-lg font-bold text-slate-900">{v}</div></div>
            ))}
          </div>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[420px] text-[12.5px]">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-500 border-b border-slate-200"><th className="py-1.5 font-medium">Student</th><th className="font-medium">Goal</th><th className="font-medium">Transfer</th><th className="font-medium">Status</th></tr></thead>
              <tbody>
                {cohort.map(r => (
                  <tr key={r.n} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-medium text-slate-900">{r.n}</td><td className="text-slate-600">{r.goal}</td><td className="text-slate-600 whitespace-nowrap">{r.term}</td>
                    <td><span className={`text-[10.5px] px-1.5 py-0.5 rounded border whitespace-nowrap ${toneCls[r.tone]}`}>{r.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5"><TriangleExclamationPoint className="w-3.5 h-3.5 text-amber-600" /> Cohort bottlenecks</div>
          <p className="text-[11px] text-slate-500 mb-3">Students whose transfer date depends on each course</p>
          <div className="space-y-2.5">
            {bottlenecks.map(([c, n]) => (
              <div key={c}>
                <div className="flex justify-between text-[12px]"><span className="font-mono font-medium text-slate-800">{c}</span><span className="text-slate-500 tabular-nums">{n}</span></div>
                <div className="h-2 rounded bg-slate-100 mt-1"><div className="h-2 rounded bg-blue-600" style={{ width: `${(n / 72) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-500 leading-snug">Tells a college which sections to add before registration opens.</p>
        </div>
      </div>
    </div>
  );
};

export const Landing: React.FC = () => {
  const { user, enabled } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const schools = useSchools();

  const showcase = ['uc-davis-cs', 'uc-berkeley-eecs', 'csus-cs', 'sjsu-se'];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-8">
          <Logo />
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#data" className="hover:text-slate-900">Data</a>
            <a href="#colleges" className="hover:text-slate-900">For colleges</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {enabled && !user && <button onClick={() => setAuthOpen(true)} className="text-sm px-3 py-2 text-slate-700 hover:text-slate-900">Sign in</button>}
            <button onClick={go} className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white whitespace-nowrap">Open the planner</button>
          </div>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" /> Transfer planning for community college STEM students
          </span>
          <h1 className="mt-5 text-4xl sm:text-[52px] font-bold tracking-tight leading-[1.06] text-slate-900">
            Know when you’ll transfer, and what could change it.
          </h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
            HawkPath maps every prerequisite between you and a UC or CSU, then answers “what if?” questions, by voice or text, with exact dates.
            The AI explains. A verified planning engine does the math.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={go} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-sm">
              Build my plan free <ArrowRight className="w-4 h-4" />
            </button>
            <a href="#colleges" className="px-5 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-800">For colleges</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" />No sign-up to try</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" />Free for students</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" />Federal outcome data built in</span>
          </div>
        </div>
        <HeroPreview />
      </header>

      <div className="border-y border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {[
            [String(CRC_COURSES.length), 'courses modeled'],
            [String(PREREQ_LINKS), 'prerequisite links'],
            [String(ARTICULATION_TARGETS.length), 'transfer pathways'],
            ['5', 'AI planning tools'],
            ['Live', 'U.S. Dept. of Ed. data'],
          ].map(([v, k]) => (
            <div key={k}><div className="text-2xl font-bold text-slate-900 tabular-nums">{v}</div><div className="text-[13px] text-slate-500">{k}</div></div>
          ))}
        </div>
      </div>

      <Section id="how" eyebrow="How it works" title="From transcript to a plan you can defend, in minutes" sub="Built for students who work, commute and make these decisions on their own.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            [<Upload key="u" className="w-5 h-5" />, 'Add your classes', 'Upload a photo or PDF of your unofficial transcript. Gemini reads each row, and every course is checked against the catalog. Or add classes by hand.'],
            [<GitBranch key="g" className="w-5 h-5" />, 'See your critical path', 'A scheduling engine lays out every remaining term, respecting prerequisites, when courses are offered and your work hours.'],
            [<Mic key="m" className="w-5 h-5" />, 'Ask “what if?”', 'Fail a class, add a job, switch schools. The advisor reruns the engine, tells you the exact impact and updates your plan on screen.'],
          ].map(([icon, t, d], i) => (
            <div key={t as string} className="relative rounded-xl border border-slate-200 p-6 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">{icon}</div>
                <span className="text-xs font-semibold text-slate-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{t}</h3>
              <p className="mt-2 text-[15px] text-slate-600 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="data" tint eyebrow="Real data" title="Decisions backed by real outcomes, not guesses"
        sub="Every plan shows live figures from the U.S. Department of Education College Scorecard next to your projected transfer date.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {showcase.map(id => {
            const t = ARTICULATION_TARGETS.find(x => x.id === id)!;
            const o = schools?.schools[id];
            return (
              <div key={id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-blue-700" /><span className="font-semibold text-slate-900">{t.universityName}</span></div>
                <div className="text-xs text-slate-500 mb-4">{o?.city ?? ' '}</div>
                <dl className="space-y-2 text-sm">
                  {[['Net price / yr', fmtUSD(o?.netPrice)], ['Graduation rate', fmtPct(o?.gradRate)], ['Median debt', fmtUSD(o?.medianDebt)], ['Earnings, 10 yrs', fmtUSD(o?.medianEarnings10yr)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-semibold tabular-nums text-slate-900">{schools ? v : <span className="inline-block w-12 h-3 bg-slate-100 rounded animate-pulse" />}</dd></div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-slate-500">Source: collegescorecard.ed.gov via api.data.gov, fetched live and cached for 24 hours. Net price is the average after grants for in-state students.</p>
      </Section>

      <Section eyebrow="Product" title="Everything a transfer plan needs">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {[
            [<Mic key="1" className="w-5 h-5" />, 'Voice advisor', 'Hands-free questions and spoken answers in the browser. Every tool call is shown, so answers can be checked.'],
            [<Route key="2" className="w-5 h-5" />, 'What-if simulator', 'Sliders and one-click stress tests for failed classes, unit loads and work hours. The plan updates instantly.'],
            [<GitBranch key="3" className="w-5 h-5" />, 'Prerequisite graph', 'A term-by-term graph with the critical path highlighted. Hover any course to see what it needs and what it unlocks.'],
            [<Gauge key="4" className="w-5 h-5" />, 'Workload-aware', 'Working 25+ hours a week caps your unit load to protect your GPA, and the timeline stretches honestly to match.'],
            [<LineChart key="5" className="w-5 h-5" />, 'School comparison', 'Projected transfer term, GPA fit, net price, graduation rate, debt and earnings for each university, side by side.'],
            [<FileText key="6" className="w-5 h-5" />, 'Counselor-ready report', 'A printable plan with the critical path and term-by-term schedule, ready for a MESA or transfer appointment.'],
          ].map(([icon, t, d]) => (
            <div key={t as string}>
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">{icon}</div>
              <h3 className="mt-4 font-semibold text-slate-900">{t}</h3>
              <p className="mt-1.5 text-[15px] text-slate-600 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="colleges" tint eyebrow="For colleges" title="See every student’s path, and fix bottlenecks before registration"
        sub="The same engine that powers each student’s plan rolls up into a counselor workspace for MESA programs and transfer centers.">
        <CounselorPreview />
        <div className="mt-8 grid sm:grid-cols-3 gap-6 text-[15px]">
          {[
            [<Users key="a" className="w-5 h-5" />, 'Proactive outreach', 'Find students whose transfer date just slipped, before they miss a deadline.'],
            [<TriangleExclamationPoint key="b" className="w-5 h-5" />, 'Section planning', 'See which courses block the most students, term by term.'],
            [<Lock key="c" className="w-5 h-5" />, 'Privacy by design', 'Owner-only security rules, campus SSO and data agreements. Students control what they share.'],
          ].map(([icon, t, d]) => (
            <div key={t as string} className="flex gap-3">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-white border border-slate-200 text-blue-700 flex items-center justify-center">{icon}</div>
              <div><div className="font-semibold text-slate-900">{t}</div><div className="text-slate-600 mt-0.5">{d}</div></div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Trust" title="An AI advisor that can’t make up your schedule">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="text-[15px] text-slate-600 leading-relaxed space-y-4">
            <p>General chatbots guess, and a wrong guess about prerequisites can cost a student a year. In HawkPath, the language model never computes a plan.
              It can only call deterministic tools (a topological scheduler, a critical-path solver, prerequisite lookup, a school comparer and federal outcome data),
              and it must report the numbers they return.</p>
            <ul className="space-y-2.5">
              {[
                'API keys stay on the server and are never sent to the browser.',
                'Every request is validated, size-limited and rate-limited.',
                'Automatic failover between AI models, with an offline answer if AI is unavailable.',
                'Accounts use Firebase Authentication; saved plans are locked to their owner by security rules. We never sell student data.',
              ].map(t => <li key={t} className="flex gap-2.5"><ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />{t}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 font-mono text-[12.5px] leading-relaxed text-slate-700 overflow-x-auto">
            <div className="text-slate-400">// one question, end to end</div>
            <div className="mt-3"><span className="text-blue-700">voice</span> → text <span className="text-slate-400">(Web Speech API)</span></div>
            <div className="ml-3 border-l-2 border-slate-200 pl-4 py-2 space-y-1.5">
              <div><Lock className="inline w-3.5 h-3.5 mr-1 text-emerald-600" />/api/advisor <span className="text-slate-400">validate · rate-limit · auth</span></div>
              <div><Sparkles className="inline w-3.5 h-3.5 mr-1 text-blue-700" />Gemini <span className="text-slate-400">(function calling)</span></div>
              <div className="ml-3 border-l-2 border-slate-200 pl-4 text-emerald-700">
                <div>simulate_what_if()</div><div>get_course_dependencies()</div><div>compare_transfer_targets()</div><div>get_school_outcomes() <span className="text-slate-400">← College Scorecard</span></div><div>show_scenario_on_dashboard()</div>
              </div>
              <div><Database className="inline w-3.5 h-3.5 mr-1 text-slate-500" />planning engine <span className="text-slate-400">same code the UI draws</span></div>
            </div>
            <div><span className="text-blue-700">answer</span> → spoken reply + live plan update</div>
          </div>
        </div>
      </Section>

      <Section id="pricing" tint eyebrow="Pricing" title="Free for students. Colleges fund the scale." sub="Students should never have to pay to find out when they can transfer.">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: 'Student', price: '$0', per: 'free forever', cta: 'Build my plan', action: go, highlight: true,
              items: ['Voice and text what-if advisor', 'Prerequisite graph and critical path', 'Live school outcome data', 'Transcript import', 'Counselor-ready report'] },
            { name: 'Student Plus', price: '$3', per: 'per month · coming soon', cta: enabled ? 'Join the waitlist' : 'Coming soon', action: () => enabled && setAuthOpen(true),
              items: ['Everything in Student', 'Registration-day seat alerts', 'Saved plan history and comparisons', 'Priority AI capacity'] },
            { name: 'Campus', price: 'Custom', per: 'per college, per year', cta: 'Request a pilot', action: () => { window.location.href = 'mailto:?subject=HawkPath%20campus%20pilot'; },
              items: ['Counselor workspace for every student plan', 'Cohort bottleneck analytics', 'Campus SSO and data agreements', 'Official catalog and articulation sync'] },
          ].map(t => (
            <div key={t.name} className={`rounded-xl p-6 bg-white border flex flex-col ${t.highlight ? 'border-blue-600 ring-1 ring-blue-600 shadow-lg shadow-blue-900/5' : 'border-slate-200'}`}>
              <div className="font-semibold text-slate-900">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1.5"><span className="text-4xl font-bold text-slate-900">{t.price}</span><span className="text-sm text-slate-500">{t.per}</span></div>
              <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700 flex-1">
                {t.items.map(i => <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-blue-700 shrink-0 mt-1" />{i}</li>)}
              </ul>
              <button onClick={t.action} className={`mt-6 py-2.5 rounded-lg font-semibold text-sm ${t.highlight ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'border border-slate-300 hover:bg-slate-50 text-slate-800'}`}>{t.cta}</button>
            </div>
          ))}
        </div>
      </Section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">Frequently asked questions</h2>
        <FAQ q="Is this an official degree audit?" a="No. HawkPath is a planning aid that helps you arrive at your counselor appointment with a concrete plan and the right questions. Always confirm articulation on ASSIST.org and with a counselor." />
        <FAQ q="Which schools and majors are supported?" a="Today: CRC STEM pathways to UC Davis (Computer Science, Data Science), Sacramento State (Computer Science), UC Berkeley (EECS) and San José State (Software Engineering). More majors and colleges come with official catalog sync." />
        <FAQ q="Where does the cost and graduation data come from?" a="The U.S. Department of Education College Scorecard, an official federal dataset. It is fetched live and cached for 24 hours." />
        <FAQ q="What happens to my data?" a="As a guest, your plan stays in your browser. With an account, we store only your course list and plan settings, locked by security rules so that only you can read them. We never sell data." />
        <FAQ q="Do I have to use voice?" a="No. Voice is optional. Everything works by typing, and the sliders run the same engine without any AI at all." />
      </section>

      <section className="bg-blue-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Find out exactly when you can transfer.</h2>
            <p className="text-blue-100 mt-1">Takes about two minutes. No account needed.</p>
          </div>
          <button onClick={go} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white hover:bg-blue-50 text-blue-800 font-semibold">Build my plan <ArrowRight className="w-4 h-4" /></button>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-4 gap-8 text-sm">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5"><LogoMark className="w-7 h-7" /><span className="font-bold text-slate-900">HawkPath</span></div>
            <p className="mt-3 text-slate-500 max-w-sm">Transfer planning for community college STEM students. An independent project, not an official Cosumnes River College or Los Rios service.</p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-2">Product</div>
            <ul className="space-y-1.5 text-slate-600"><li><button onClick={go} className="hover:text-slate-900">Planner</button></li><li><a href="#data" className="hover:text-slate-900">Data sources</a></li><li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li></ul>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-2">For institutions</div>
            <ul className="space-y-1.5 text-slate-600"><li><a href="#colleges" className="hover:text-slate-900">Counselor workspace</a></li><li><a href="https://collegescorecard.ed.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">College Scorecard</a></li><li><a href="https://assist.org/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">ASSIST.org</a></li></ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-500">© 2026 HawkPath. Planning aid only, not an official degree audit.</div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />
    </div>
  );
};
