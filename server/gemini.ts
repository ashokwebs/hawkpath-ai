/**
 * Shared Google Gemini client (server-only).
 * - Key read from GEMINI_API_KEY (or GOOGLE_API_KEY); never sent to the browser.
 * - Model: GEMINI_MODEL if set, otherwise auto-picks the newest stable "gemini-X-flash"
 *   the key can access (via the models list endpoint), with safe fallbacks.
 * - Retries 429 / 5xx with exponential backoff + jitter.
 */
import { GoogleGenAI, ApiError, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

export const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

let client: GoogleGenAI | null = null;
export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: apiKey(), apiVersion: 'v1beta' }); // function calling + JSON schema require v1beta
  return client;
}

// Fast models that support function calling, in preference order. On the free tier each
// model has its own small daily quota, so rotating through a pool multiplies capacity.
const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
];
let discovered: string[] | null = null;

async function discoverNewerFlash(): Promise<string[]> {
  if (discovered) return discovered;
  const found: { id: string; v: number }[] = [];
  try {
    const pager = await gemini().models.list({ config: { pageSize: 200 } });
    for await (const m of pager) {
      const id = String(m.name ?? '').replace(/^models\//, '');
      const match = id.match(/^gemini-(\d+(?:\.\d+)?)-flash$/); // stable Flash only (no lite/preview/tts/image)
      const canGenerate = !m.supportedActions || m.supportedActions.includes('generateContent');
      if (match && canGenerate && !PREFERRED_MODELS.includes(id)) found.push({ id, v: Number(match[1]) });
    }
    found.sort((x, y) => y.v - x.v);
    discovered = found.slice(0, 2).map(f => f.id); // cache only a successful discovery
    return discovered;
  } catch (e) {
    console.warn('[gemini] model list failed:', e instanceof Error ? e.message : e);
    return [];
  }
}

async function candidates(): Promise<string[]> {
  const pinned = process.env.GEMINI_MODEL;
  const list = [...(pinned ? [pinned] : []), ...PREFERRED_MODELS, ...(await discoverNewerFlash())];
  return [...new Set(list)];
}

// Models that just returned 503/429/timeout are skipped for a while (circuit breaker).
const cooldownUntil = new Map<string, number>();
const COOLDOWN_MS = 120_000;
const ATTEMPT_TIMEOUT_MS = 20_000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const isAbort = (e: unknown) => e instanceof Error && /abort|timed? ?out/i.test(e.message + e.name);
export const isRetryable = (e: unknown) => isAbort(e) || (e instanceof ApiError && (e.status === 429 || e.status >= 500));

/**
 * generateContent with: per-attempt timeout, instant failover to the next model on
 * 404/429/5xx/timeout, a per-model cooldown, and one exponential-backoff round if
 * every model is busy.
 */
export async function generate(params: Omit<GenerateContentParameters, 'model'>): Promise<{ res: GenerateContentResponse; model: string }> {
  const all = await candidates();
  let lastErr: unknown = new Error('No Gemini model available');
  const deadline = Date.now() + 40_000; // total budget per call, keeps voice replies snappy
  for (let round = 0; round < 2; round++) {
    const now = Date.now();
    const ready = all.filter(m => (cooldownUntil.get(m) ?? 0) <= now);
    for (const [i, model] of (ready.length ? ready : all).entries()) {
      const left = deadline - Date.now();
      if (left < 2_000) throw lastErr;
      // Primary model gets the long timeout; overloaded backups fail fast.
      const timeout = Math.min(left, i === 0 ? ATTEMPT_TIMEOUT_MS : 10_000);
      try {
        const res = await gemini().models.generateContent({
          ...params, model, config: { ...params.config, abortSignal: AbortSignal.timeout(timeout) },
        });
        cooldownUntil.delete(model);
        return { res, model };
      } catch (e) {
        lastErr = e;
        const notFound = e instanceof ApiError && e.status === 404;
        if (!notFound && !isRetryable(e)) throw e; // e.g. bad key / bad request: fail fast
        // Free-tier 429: Google tells us how long to wait. If it's short, wait and retry this model once.
        const wait = e instanceof ApiError && e.status === 429 ? retryDelayMs(e) : null;
        if (wait != null && wait <= 12_000 && Date.now() + wait + 3_000 < deadline) {
          console.warn(`[gemini] ${model} rate-limited, waiting ${Math.ceil(wait / 1000)}s as advised`);
          await sleep(wait);
          try {
            const res = await gemini().models.generateContent({
              ...params, model, config: { ...params.config, abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now())) },
            });
            return { res, model };
          } catch (e2) { lastErr = e2; }
        }
        // Park the model: 1h if missing, until Google's retryDelay for a daily quota, else 2 min.
        const park = notFound ? 3_600_000 : Math.max(COOLDOWN_MS, wait ?? 0);
        cooldownUntil.set(model, Date.now() + park);
        console.warn(`[gemini] ${model} unavailable (${e instanceof ApiError ? e.status : 'timeout'}), trying next model`);
      }
    }
    if (round === 0) await sleep(800 + Math.random() * 400);
  }
  throw lastErr;
}

/** Parses Google's RetryInfo ("retryDelay": "7s") from a 429 error, in ms. */
function retryDelayMs(e: ApiError): number | null {
  const m = String(e.message).match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(Number(m[1]) * 1000) + 250 : 4_000;
}

/** Human-readable reason for logs/UI, without leaking provider internals. */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400 && /api key/i.test(e.message)) return 'AI key rejected';
    if (e.status === 401 || e.status === 403) return 'AI key rejected';
    if (e.status === 429) return 'AI provider rate limit hit (retried with backoff)';
    if (e.status >= 500) return 'AI provider temporarily unavailable';
    return `AI provider error ${e.status}`;
  }
  if (e instanceof Error && /fetch failed|ENOTFOUND|ECONN|timeout/i.test(e.message)) return 'AI provider unreachable';
  return 'AI service unavailable';
}
