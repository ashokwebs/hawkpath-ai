import { handleAdvisor } from './agent';
import { handleTranscript } from './transcript';
import { handleSchools } from './scorecard';

export interface RouteResult { status: number; body: Record<string, unknown>; headers?: Record<string, string> }

/** path → allowed method + max body size */
export const ROUTES: Record<string, { method: 'GET' | 'POST'; limit: number }> = {
  '/api/advisor': { method: 'POST', limit: 64_000 },
  '/api/transcript': { method: 'POST', limit: 6_500_000 },
  '/api/schools': { method: 'GET', limit: 0 },
};

export async function route(path: string, body: unknown, ip: string, authHeader?: string | null): Promise<RouteResult> {
  switch (path) {
    case '/api/advisor': return handleAdvisor(body, ip, authHeader);
    case '/api/transcript': return handleTranscript(body, ip);
    case '/api/schools': return handleSchools();
    default: return { status: 404, body: { error: 'Not found' } };
  }
}

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
