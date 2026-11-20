import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Serves /api/verify during `npm run dev` / `npm run preview` so the access gate
// works locally. Put ACCESS_TOKENS in .env.local. On Vercel, api/verify.js is used.
function localApi(env) {
  const middleware = async (req, res, next) => {
    if (!req.url.startsWith('/api/verify')) return next()
    process.env.ACCESS_TOKENS = env.ACCESS_TOKENS || ''
    const { default: handler } = await import('./api/verify.js')
    let raw = ''
    for await (const chunk of req) raw += chunk
    req.body = raw
    res.status = (code) => { res.statusCode = code; return res }
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
    handler(req, res)
  }
  return {
    name: 'local-api',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localApi(env)],
    server: {
      port: 3000,
      open: true,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    },
    preview: {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    },
  }
})
