import type { H3Event } from 'h3'

export interface AuthContext {
  userId: string
  username: string
  /** Role as stored in the DB at request time (never taken from the JWT). */
  role: 'admin' | 'viewer'
  authProvider: 'local' | 'oidc'
  /** How the request authenticated. API tokens are denied on credential/account routes. */
  authType: 'jwt' | 'api_token'
  /** Only set when authType === 'api_token'. Never the secret. */
  apiTokenId?: string
  apiTokenName?: string
}

export function getAuthContext(event: H3Event): AuthContext | undefined {
  return (event.context as { auth?: AuthContext }).auth
}

/** Throws 401/403 unless the authenticated user is an admin (DB role). */
export function requireAdmin(event: H3Event): AuthContext {
  const auth = getAuthContext(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (auth.role !== 'admin') throw createError({ statusCode: 403, message: 'Administrator access required' })
  return auth
}

/** Throws unless the request authenticated with a session JWT (cookie/OIDC/header), never an API token. */
export function requireJwtAuth(event: H3Event): AuthContext {
  const auth = getAuthContext(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Authentication required' })
  if (auth.authType !== 'jwt') throw createError({ statusCode: 403, message: 'Not available for API tokens' })
  return auth
}

// ---------------------------------------------------------------------------
// Path normalization + role policy (pure; used by the auth middleware)
// ---------------------------------------------------------------------------

/**
 * Normalize a request path for policy decisions: strip query/fragment, resolve
 * dot segments, percent-decode (repeatedly, bounded), collapse duplicate and
 * backslash separators, drop trailing slash.
 */
export function normalizePolicyPath(rawPath: string): string {
  let path = String(rawPath ?? '').split('?')[0]!.split('#')[0]!
  for (let i = 0; i < 4; i++) {
    let resolved: string
    try {
      // Collapse separators first so a leading `//` is never parsed as a host.
      const flat = path.replace(/[\\/]+/g, '/')
      resolved = new URL(flat.startsWith('/') ? flat : `/${flat}`, 'http://policy.invalid').pathname
    } catch {
      return '/__invalid__'
    }
    let decoded: string
    try {
      decoded = decodeURIComponent(resolved)
    } catch {
      return '/__invalid__'
    }
    if (decoded === path) break
    path = decoded
  }
  path = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

const SAFE_METHODS = new Set(['GET', 'HEAD'])

const ADMIN_ONLY_PREFIXES = [
  '/api/users',
  '/api/backup',
  '/api/admin',
  '/api/auth/oidc/config',
  '/api/auth/oidc/check'
]

function matchesPrefix(lowerPath: string, prefix: string): boolean {
  return lowerPath === prefix || lowerPath.startsWith(`${prefix}/`)
}

export type PolicyDecision = 'allow' | 'forbidden'

/**
 * Role policy. Admins may do anything. Viewers are read-only:
 *  - GET/HEAD allowed everywhere except admin-only prefixes (users, backup, admin,
 *    OIDC config/check),
 *  - plus exactly: GET/PUT own /api/users/<self>, PUT own /api/users/<self>/password
 *    and POST /api/auth/logout.
 */
export function evaluateRolePolicy(input: { role: string, method: string, path: string, userId: string }): PolicyDecision {
  if (input.role === 'admin') return 'allow'
  if (input.role !== 'viewer') return 'forbidden'

  const method = input.method.toUpperCase()
  const path = normalizePolicyPath(input.path)
  const lower = path.toLowerCase()

  if (method === 'POST' && lower === '/api/auth/logout') return 'allow'

  // Self-service API tokens (handlers additionally bind every operation to the caller).
  if (lower === '/api/auth/tokens' && ['GET', 'HEAD', 'POST', 'DELETE'].includes(method)) return 'allow'
  if (/^\/api\/auth\/tokens\/[^/]+$/.test(lower) && (method === 'DELETE' || method === 'GET' || method === 'HEAD')) return 'allow'

  const selfMatch = /^\/api\/users\/([^/]+)(\/password)?$/i.exec(path)
  if (selfMatch && selfMatch[1] === input.userId) {
    if (!selfMatch[2]) {
      if (method === 'GET' || method === 'HEAD' || method === 'PUT') return 'allow'
    } else if (method === 'PUT') {
      return 'allow'
    }
  }

  if (ADMIN_ONLY_PREFIXES.some(p => matchesPrefix(lower, p))) return 'forbidden'
  return SAFE_METHODS.has(method) ? 'allow' : 'forbidden'
}

// ---------------------------------------------------------------------------
// API-token deny contract (D6). Pure; applied in addition to the role policy.
// Method-aware on the normalized path; HEAD is treated as GET so safe-method
// aliases cannot bypass a GET rule. Anchored, case-insensitive patterns.
// ---------------------------------------------------------------------------

interface DenyRule { methods: 'any' | 'non-get' | 'get' | 'delete', re: RegExp }

const API_TOKEN_DENY_RULES: DenyRule[] = [
  // Credential / account / admin / backup management
  { methods: 'any', re: /^\/api\/(users|backup|admin)(\/|$)/ },
  { methods: 'any', re: /^\/api\/auth\/(oidc\/(config|check)|tokens)(\/|$)/ },
  // Raw exports (contain plaintext public tokens / raw rows), activity (previous_state), stats (recentActivity), undo
  { methods: 'any', re: /^\/api\/data\/export(\/|$)/ },
  { methods: 'any', re: /^\/api\/export(\/|$)/ },
  { methods: 'any', re: /^\/api\/activity(\/|$)/ },
  { methods: 'any', re: /^\/api\/dashboard\/stats$/ },
  // Imports (both families + layout templates): default deny
  { methods: 'any', re: /^\/api\/data\/import(\/|$)/ },
  { methods: 'non-get', re: /^\/api\/import(\/|$)/ },
  { methods: 'any', re: /^\/api\/layout-templates\/import$/ },
  // Settings: reads allowed, writes denied
  { methods: 'non-get', re: /^\/api\/settings(\/|$)/ },
  // Public access tokens (switches AND patch panels), all methods
  { methods: 'any', re: /^\/api\/(switches|patch-panels)\/[^/]+\/public-token(\/|$)/ },
  // Deletes: category (not approved) and Site/Switch (permanent) stay denied. Network,
  // nested allocation/range, VLAN and LAG deletes are unlocked by their A5
  // preview/impactToken contracts (server/api/**).
  { methods: 'delete', re: /^\/api\/device-types\/[^/]+$/ },
  { methods: 'delete', re: /^\/api\/(sites|switches)\/[^/]+$/ },
]

export function evaluateApiTokenPolicy(input: { method: string, path: string }): PolicyDecision {
  const raw = input.method.toUpperCase()
  const method = raw === 'HEAD' ? 'GET' : raw
  const lower = normalizePolicyPath(input.path).toLowerCase()
  for (const rule of API_TOKEN_DENY_RULES) {
    const applies = rule.methods === 'any'
      || (rule.methods === 'non-get' && method !== 'GET')
      || (rule.methods === 'get' && method === 'GET')
      || (rule.methods === 'delete' && method === 'DELETE')
    if (applies && rule.re.test(lower)) return 'forbidden'
  }
  return 'allow'
}
