/**
 * Transcript → structured course record, using Gemini multimodal input (image/PDF)
 * + JSON-schema structured output. Output is then re-validated against the CRC
 * catalog so hallucinated course codes are dropped, never trusted.
 */
import { COURSE_MAP } from '../src/data/crcCurriculum.js';
import { normalizeCourseCode } from '../src/utils/scenario.js';
import { takeToken } from './ratelimit.js';
import { apiKey, generate, describeError } from './gemini.js';
import { ApiError } from '@google/genai';

const MAX_BYTES = 4_500_000; // ~4.5MB decoded
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
const GRADES = new Set(['A', 'B', 'C', 'D', 'F', 'IP', 'CR']);

const SCHEMA = {
  type: 'object',
  required: ['studentName', 'courses'],
  properties: {
    studentName: { type: 'string' },
    courses: {
      type: 'array',
      items: {
        type: 'object',
        required: ['courseCode', 'grade', 'term', 'units'],
        properties: {
          courseCode: { type: 'string', description: 'Department + number, e.g. "CISP 360"' },
          grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F', 'IP', 'CR', 'W'] },
          term: { type: 'string', description: 'e.g. "Fall 2025"' },
          units: { type: 'number' },
        },
      },
    },
  },
};

export async function handleTranscript(raw: any, ip: string) {
  const gate = takeToken(`tx:${ip}`, 'transcript');
  if (!gate.ok) return { status: 429, headers: { 'Retry-After': String(gate.retryAfter) }, body: { error: `Rate limit reached. Try again in ${gate.retryAfter}s.` } };

  const mediaType = String(raw?.mediaType ?? '');
  const data = String(raw?.data ?? '');
  if (!ALLOWED.has(mediaType)) return { status: 415, body: { error: 'Upload a PNG, JPEG, WEBP or PDF.' } };
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) return { status: 400, body: { error: 'File must be base64 encoded.' } };
  if (data.length * 0.75 > MAX_BYTES) return { status: 413, body: { error: 'File too large (max ~4.5 MB).' } };
  if (!apiKey()) return { status: 503, body: { error: 'Transcript reading needs the AI service, which is not configured on this server. You can still enter courses by hand.' } };

  const started = Date.now();
  try {
    const { res, model } = await generate({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: mediaType, data } },
          { text: 'This is a community college unofficial transcript (or a photo/screenshot of one). Extract every course row: course code, letter grade (use IP for in-progress/current, W for withdrawn), term and units. Do not invent rows that are not visible. If this is not a transcript, return an empty courses array.' },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: SCHEMA,
        temperature: 0,
      },
    });
    if (res.promptFeedback?.blockReason || !res.text) return { status: 422, body: { error: 'Could not read that file.' } };
    const parsed = JSON.parse(res.text);

    const recognized: any[] = [];
    const unrecognized: string[] = [];
    for (const c of Array.isArray(parsed.courses) ? parsed.courses.slice(0, 80) : []) {
      const code = normalizeCourseCode(String(c.courseCode ?? ''));
      if (c.grade === 'W') continue;
      const known = COURSE_MAP.get(code);
      if (known && GRADES.has(c.grade)) {
        recognized.push({ courseCode: code, grade: c.grade, term: String(c.term ?? '').slice(0, 30), units: known.units });
      } else {
        unrecognized.push(code);
      }
    }
    return {
      status: 200,
      body: {
        studentName: String(parsed.studentName ?? '').slice(0, 60),
        courses: recognized,
        unrecognized: [...new Set(unrecognized)].slice(0, 30),
        model,
        ms: Date.now() - started,
        usage: { input: res.usageMetadata?.promptTokenCount ?? 0, output: res.usageMetadata?.candidatesTokenCount ?? 0 },
      },
    };
  } catch (err) {
    console.error('[transcript]', describeError(err), err instanceof Error ? err.message : err);
    if (err instanceof ApiError && err.status === 429) return { status: 429, body: { error: 'AI provider is busy. Try again in a minute.' } };
    if (err instanceof SyntaxError) return { status: 502, body: { error: 'Could not parse the transcript. Try a clearer image.' } };
    return { status: 502, body: { error: 'Transcript reading failed. You can still enter courses by hand.' } };
  }
}
