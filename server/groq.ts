/**
 * Groq client (server-only). Primary provider for the advisor: very low latency
 * and generous free-tier limits. Key from GROQ_API_KEY; never sent to the browser.
 */
import Groq from 'groq-sdk';

export const groqKey = () => process.env.GROQ_API_KEY || '';

let client: Groq | null = null;
export function groq(): Groq {
  client ??= new Groq({ apiKey: groqKey(), maxRetries: 0, timeout: 15_000 }); // we fail over instead of waiting
  return client;
}

/** Tool-calling models in preference order (override the first with GROQ_MODEL). */
export function groqModels(): string[] {
  const list = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  const pinned = process.env.GROQ_MODEL;
  return pinned ? [pinned, ...list.filter(m => m !== pinned)] : list;
}

/** Errors worth failing over to the next model/provider for. */
export function isGroqTransient(e: unknown): boolean {
  if (e instanceof Groq.APIError) return e.status === undefined || e.status === 404 || e.status === 408 || e.status === 429 || (e.status ?? 0) >= 500;
  return true; // network / timeout / unknown
}

export function describeGroqError(e: unknown): string {
  if (e instanceof Groq.AuthenticationError || e instanceof Groq.PermissionDeniedError) return 'Groq key rejected';
  if (e instanceof Groq.RateLimitError) return 'Groq rate limit hit';
  if (e instanceof Groq.APIConnectionTimeoutError || e instanceof Groq.APIConnectionError) return 'Groq unreachable';
  if (e instanceof Groq.APIError) return `Groq error ${e.status}`;
  return 'Groq unavailable';
}
