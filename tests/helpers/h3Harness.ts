import type { PrismaClient } from '@prisma/client'
import { signToken, type SignTokenPayload } from '../../server/utils/auth'
import { setTestRuntimeConfig, resetTestRuntimeConfig } from '../testHelpers'

/**
 * Minimal, dependency-free h3 harness for exercising REAL Nitro route handlers and the
 * REAL auth middleware in vitest (no HTTP server). Global h3 helpers are stubbed to
 * operate on a plain FakeEvent so cookies, redirects and headers can be inspected.
 */

export interface FakeEvent {
  method: string
  /** Raw request target (path + query), as Nitro's `event.path`. */
  path: string
  headers: Record<string, string>
  cookies: Record<string, string>
  body?: unknown
  context: { params?: Record<string, string>, auth?: unknown }
  https: boolean
  // outputs
  setCookies: Array<{ name: string, value: string, options: Record<string, unknown> }>
  deletedCookies: string[]
  redirect?: { location: string, status: number }
  responseHeaders: Record<string, string>
}

export interface DispatchInput {
  method?: string
  path: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
  body?: unknown
  https?: boolean
  /** Skip the auth middleware (handler only). */
  skipMiddleware?: boolean
}

export interface DispatchResult {
  status: number
  body: unknown
  redirect?: { location: string, status: number }
  setCookies: FakeEvent['setCookies']
  deletedCookies: string[]
  headers: Record<string, string>
  error?: { statusCode?: number, message?: string, data?: unknown }
  /** `event.context.auth` as set by the middleware (undefined when public/denied). */
  auth?: { userId: string, username: string, role: string, authProvider: string }
}

type G = Record<string, unknown>
const g = globalThis as unknown as G
const ev = (e: unknown) => e as FakeEvent

const pathOnly = (p: string) => p.split('?')[0]!

export function installH3Globals(): void {
  g.getRequestPath = (e: unknown) => pathOnly(ev(e).path)
  g.getMethod = (e: unknown) => ev(e).method
  g.getHeader = (e: unknown, name: string) => ev(e).headers[name.toLowerCase()]
  g.getCookie = (e: unknown, name: string) => ev(e).cookies[name]
  g.setCookie = (e: unknown, name: string, value: string, options: Record<string, unknown> = {}) => {
    ev(e).setCookies.push({ name, value, options })
  }
  g.deleteCookie = (e: unknown, name: string) => { ev(e).deletedCookies.push(name) }
  g.sendRedirect = (e: unknown, location: string, status = 302) => {
    ev(e).redirect = { location, status }
    return location
  }
  g.setHeader = (e: unknown, name: string, value: string) => { ev(e).responseHeaders[name.toLowerCase()] = value }
  g.getQuery = (e: unknown) => {
    const q = new URL(ev(e).path, 'http://q.invalid').searchParams
    const out: Record<string, string | string[]> = {}
    for (const k of new Set(q.keys())) {
      const all = q.getAll(k)
      out[k] = all.length > 1 ? all : all[0]!
    }
    return out
  }
  // Like h3: origin derived from Host + socket protocol; X-Forwarded-* is NOT used.
  g.getRequestURL = (e: unknown) => {
    const x = ev(e)
    return new URL(x.path, `${x.https ? 'https' : 'http'}://${x.headers.host ?? 'ezswm.test'}`)
  }
}

export function makeEvent(input: DispatchInput): FakeEvent {
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.headers ?? {})) headers[k.toLowerCase()] = v
  return {
    method: (input.method ?? 'GET').toUpperCase(),
    path: input.path,
    headers,
    cookies: { ...(input.cookies ?? {}) },
    body: input.body,
    context: {},
    https: input.https ?? false,
    setCookies: [],
    deletedCookies: [],
    responseHeaders: {}
  }
}

type Handler = (event: unknown) => unknown

/** path pattern → route module (relative to tests/helpers) */
const ROUTES: Array<{ method: string, re: RegExp, load: () => Promise<{ default: unknown }>, params?: string[] }> = [
  { method: 'GET', re: /^\/api\/auth\/oidc\/status$/, load: () => import('../../server/api/auth/oidc/status.get') },
  { method: 'GET', re: /^\/api\/auth\/oidc\/start$/, load: () => import('../../server/api/auth/oidc/start.get') },
  { method: 'GET', re: /^\/api\/auth\/oidc\/callback$/, load: () => import('../../server/api/auth/oidc/callback.get') },
  { method: 'GET', re: /^\/api\/auth\/oidc\/config$/, load: () => import('../../server/api/auth/oidc/config.get') },
  { method: 'PUT', re: /^\/api\/auth\/oidc\/config$/, load: () => import('../../server/api/auth/oidc/config.put') },
  { method: 'POST', re: /^\/api\/auth\/oidc\/check$/, load: () => import('../../server/api/auth/oidc/check.post') },
  { method: 'POST', re: /^\/api\/auth\/logout$/, load: () => import('../../server/api/auth/logout.post') },
  { method: 'GET', re: /^\/api\/users$/, load: () => import('../../server/api/users/index.get') },
  { method: 'POST', re: /^\/api\/users$/, load: () => import('../../server/api/users/index.post') },
  { method: 'GET', re: /^\/api\/users\/([^/]+)$/, params: ['id'], load: () => import('../../server/api/users/[id].get') },
  { method: 'PUT', re: /^\/api\/users\/([^/]+)$/, params: ['id'], load: () => import('../../server/api/users/[id].put') },
  { method: 'DELETE', re: /^\/api\/users\/([^/]+)$/, params: ['id'], load: () => import('../../server/api/users/[id].delete') },
  { method: 'PUT', re: /^\/api\/users\/([^/]+)\/password$/, params: ['id'], load: () => import('../../server/api/users/[id]/password.put') },
  { method: 'GET', re: /^\/api\/settings$/, load: () => import('../../server/api/settings/index.get') },
  { method: 'PUT', re: /^\/api\/settings$/, load: () => import('../../server/api/settings/index.put') },
  { method: 'GET', re: /^\/api\/sites$/, load: () => import('../../server/api/sites/index.get') },
  { method: 'POST', re: /^\/api\/sites$/, load: () => import('../../server/api/sites/index.post') },
  { method: 'GET', re: /^\/api\/backup\/export$/, load: () => import('../../server/api/backup/export.get') },
  { method: 'POST', re: /^\/api\/backup\/import$/, load: () => import('../../server/api/backup/import.post') },
  { method: 'GET', re: /^\/api\/data\/export$/, load: () => import('../../server/api/data/export.get') },
  { method: 'POST', re: /^\/api\/activity\/([^/]+)\/undo$/, params: ['id'], load: () => import('../../server/api/activity/[id]/undo.post') }
]

/**
 * Runs the REAL auth middleware and then the matched REAL route handler. Mirrors Nitro:
 * a thrown error with `statusCode` becomes that status; anything else is a 500.
 */
export async function dispatch(input: DispatchInput): Promise<DispatchResult> {
  const event = makeEvent(input)
  const result: DispatchResult = { status: 200, body: undefined, setCookies: [], deletedCookies: [], headers: {} }
  const finish = () => {
    result.setCookies = event.setCookies
    result.deletedCookies = event.deletedCookies
    result.redirect = event.redirect
    result.headers = event.responseHeaders
    result.auth = event.context.auth as DispatchResult['auth']
    if (event.redirect) result.status = event.redirect.status
    return result
  }
  try {
    if (!input.skipMiddleware) {
      const { default: middleware } = await import('../../server/middleware/auth')
      await (middleware as Handler)(event)
    }
    const path = pathOnly(event.path)
    const route = ROUTES.find(r => r.method === event.method && r.re.test(path))
    if (!route) {
      // Path reached the router-less harness; middleware already allowed it.
      result.status = 404
      return finish()
    }
    const match = route.re.exec(path)!
    if (route.params) {
      event.context.params = Object.fromEntries(route.params.map((p, i) => [p, decodeURIComponent(match[i + 1]!)]))
    }
    const mod = await route.load()
    result.body = await (mod.default as Handler)(event)
    return finish()
  } catch (err) {
    const e = err as { statusCode?: number, message?: string, data?: unknown }
    result.status = e.statusCode ?? 500
    result.error = { statusCode: e.statusCode, message: e.message, data: e.data }
    return finish()
  }
}

/** Real HS256 JWT signed with the test runtime secret. */
export function tokenFor(user: { id: string, username: string, role: string }, extras: Partial<SignTokenPayload> = {}): string {
  return signToken({ sub: user.id, username: user.username, role: user.role, ...extras })
}

/** Cookie map for an authenticated request. */
export const asCookie = (token: string) => ({ ezswm_token: token })

export function setOidcRuntime(opts: { oidcEncryptionKey?: string, publicBaseUrl?: string }): void {
  // `public.appVersion` is read by the export routes.
  setTestRuntimeConfig({ public: { appVersion: 'test' }, ...opts } as never)
}

export function resetOidcRuntime(): void {
  resetTestRuntimeConfig()
}

/** Seed helper: a local user row with a valid bcrypt hash created through Prisma. */
export async function seedLocalUser(
  prisma: PrismaClient,
  over: { id?: string, username: string, role?: 'admin' | 'viewer', passwordHash?: string }
) {
  const now = new Date().toISOString()
  return prisma.user.create({
    data: {
      id: over.id ?? crypto.randomUUID(),
      username: over.username,
      display_name: over.username,
      password_hash: over.passwordHash ?? '$2a$10$abcdefghijklmnopqrstuuWJ3xv0q9Z0g5l2H0zPq3n3e0dF5v1a2',
      role: over.role ?? 'admin',
      language: 'en',
      is_setup_user: false,
      created_at: now,
      updated_at: now
    }
  })
}
