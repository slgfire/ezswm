import { createServer, request as httpRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * REAL h3 over a REAL node HTTP server (no fake event). Used to prove behaviour that a
 * hand-made event cannot: raw `event.path` query extraction, Cookie/Set-Cookie wire
 * format, header-derived origin (X-Forwarded-* ignored), 302 Location headers.
 *
 * h3 is Nitro's transitive dependency (not a direct one), so it is located in the pnpm
 * store. The global auto-imports the server code relies on are bound to real h3 functions.
 * Only use this in test files that do not rely on the mocked globals of h3Harness.
 */

type H3Module = Record<string, unknown> & {
  createApp: () => { use: (...a: unknown[]) => unknown }
  createRouter: () => { add: (path: string, handler: unknown, method: string) => unknown, handler: unknown }
  toNodeListener: (app: unknown) => (req: unknown, res: unknown) => void
}

function locateH3(): string {
  const store = join(process.cwd(), 'node_modules', '.pnpm')
  const dir = readdirSync(store).filter(d => /^h3@1\.\d+\.\d+$/.test(d)).sort().at(-1)
  const file = dir && join(store, dir, 'node_modules', 'h3', 'dist', 'index.mjs')
  if (!file || !existsSync(file)) throw new Error('h3@1.x not found in node_modules/.pnpm (run pnpm install)')
  return file
}

const ROUTES: Array<{ method: string, path: string, load: () => Promise<{ default: unknown }> }> = [
  { method: 'get', path: '/api/auth/oidc/status', load: () => import('../../server/api/auth/oidc/status.get') },
  { method: 'get', path: '/api/auth/oidc/start', load: () => import('../../server/api/auth/oidc/start.get') },
  { method: 'get', path: '/api/auth/oidc/callback', load: () => import('../../server/api/auth/oidc/callback.get') },
  { method: 'get', path: '/api/auth/oidc/config', load: () => import('../../server/api/auth/oidc/config.get') },
  { method: 'put', path: '/api/auth/oidc/config', load: () => import('../../server/api/auth/oidc/config.put') },
  { method: 'post', path: '/api/auth/oidc/check', load: () => import('../../server/api/auth/oidc/check.post') },
  { method: 'get', path: '/api/sites', load: () => import('../../server/api/sites/index.get') }
]

export interface HttpResult {
  status: number
  headers: Record<string, string | string[] | undefined>
  /** Raw `Set-Cookie` header lines, exactly as sent on the wire. */
  setCookies: string[]
  location?: string
  body: string
  json: () => unknown
}

export interface H3TestServer {
  port: number
  origin: string
  close: () => Promise<void>
  /** Raw HTTP request; `path` is sent byte-for-byte (nothing is normalized client-side). */
  request: (opts: { method?: string, path: string, headers?: Record<string, string>, body?: unknown }) => Promise<HttpResult>
}

export async function startH3Server(): Promise<H3TestServer> {
  const h3 = (await import(pathToFileURL(locateH3()).href)) as H3Module
  // Bind Nitro's auto-imports to the real implementations.
  for (const [k, v] of Object.entries(h3)) (globalThis as Record<string, unknown>)[k] = v

  const app = h3.createApp()
  const { default: middleware } = await import('../../server/middleware/auth')
  app.use(middleware)
  const router = h3.createRouter()
  for (const r of ROUTES) router.add(r.path, (await r.load()).default, r.method)
  app.use(router.handler)

  const server: Server = createServer(h3.toNodeListener(app) as never)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port

  const request: H3TestServer['request'] = opts => new Promise((resolve, reject) => {
    const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body)
    const req = httpRequest({
      host: '127.0.0.1',
      port,
      method: opts.method ?? 'GET',
      path: opts.path,
      headers: { ...(payload ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(payload)) } : {}), ...opts.headers }
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c as Buffer))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          setCookies: res.headers['set-cookie'] ?? [],
          location: res.headers.location,
          body,
          json: () => JSON.parse(body)
        })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })

  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    request,
    close: () => new Promise<void>(resolve => server.close(() => resolve()))
  }
}

/** Minimal cookie jar: applies Set-Cookie lines (incl. deletion) and renders a Cookie header. */
export class CookieJar {
  private jar = new Map<string, string>()

  apply(setCookies: string[]) {
    for (const line of setCookies) {
      const [pair, ...attrs] = line.split(';').map(s => s.trim())
      const eq = pair!.indexOf('=')
      const name = pair!.slice(0, eq)
      const value = pair!.slice(eq + 1)
      const lower = attrs.map(a => a.toLowerCase())
      const expired = lower.includes('max-age=0') || lower.some(a => a.startsWith('expires=') && Date.parse(a.slice(8)) < Date.now())
      if (expired || value === '') this.jar.delete(name)
      else this.jar.set(name, value)
    }
  }

  get(name: string) {
    return this.jar.get(name)
  }

  header(): Record<string, string> {
    return this.jar.size ? { cookie: [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}
  }
}
