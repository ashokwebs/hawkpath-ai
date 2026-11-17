import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves /api/* from the same Node process during `npm run dev`.
 * In production the identical handlers run as Vercel functions (api/*.ts).
 * Server secrets (GEMINI_API_KEY) are read from .env on the server only; they are
 * not prefixed with VITE_, so Vite never inlines them into the browser bundle.
 */
function apiRoutes(): Plugin {
  return {
    name: 'hawkpath-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (!path.startsWith('/api/')) return next()
        const { route, ROUTES, SECURITY_HEADERS } = await server.ssrLoadModule('/server/routes.ts')
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v as string)
        const send = (status: number, body: unknown) => { res.statusCode = status; res.end(JSON.stringify(body)) }
        const spec = ROUTES[path]
        if (!spec) return send(404, { error: 'Not found' })
        if (req.method !== spec.method) return send(405, { error: `${spec.method} only` })

        let raw = ''
        for await (const chunk of req) {
          raw += chunk
          if (raw.length > spec.limit) return send(413, { error: 'Payload too large' })
        }
        try {
          const body = raw ? JSON.parse(raw) : {}
          const out = await route(path, body, req.socket.remoteAddress ?? 'local', req.headers.authorization)
          for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v as string)
          send(out.status, out.body)
        } catch (e) {
          console.error('[api]', e)
          send(e instanceof SyntaxError ? 400 : 500, { error: e instanceof SyntaxError ? 'Malformed JSON' : 'Internal error' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_MODEL', 'SCORECARD_API_KEY', 'DAILY_REQUEST_BUDGET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }
  return {
    plugins: [react(), apiRoutes()],
    server: { port: 5173, host: true },
  }
})
