import { route, ROUTES, SECURITY_HEADERS } from './routes';

/** Adapts the shared route handlers to Vercel's Node function signature. */
export function vercelHandler(path: string) {
  return async function handler(req: any, res: any) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    const spec = ROUTES[path];
    if (req.method !== spec.method) return res.status(405).json({ error: `${spec.method} only` });
    try {
      const body = spec.method === 'GET' ? {} : typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
      if (spec.method === 'POST' && JSON.stringify(body).length > spec.limit) return res.status(413).json({ error: 'Payload too large' });
      const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
      const out = await route(path, body, ip, req.headers.authorization);
      for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v);
      return res.status(out.status).json(out.body);
    } catch (e) {
      console.error('[api]', e);
      return res.status(e instanceof SyntaxError ? 400 : 500).json({ error: e instanceof SyntaxError ? 'Malformed JSON' : 'Internal error' });
    }
  };
}
