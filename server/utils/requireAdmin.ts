import type { H3Event } from 'h3'

export interface AuthContext {
  userId: string
  username: string
  /** Role as stored in the DB at request time (never taken from the JWT). */
  role: 'admin' | 'viewer'
  authProvider: 'local' | 'oidc'
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
