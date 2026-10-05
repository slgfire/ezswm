// Pure, headless role helpers for UI affordances. The server (requireAdmin)
// remains the only authority; these only decide what the UI offers.

export type AuthRoleState = 'loading' | 'anonymous' | 'admin' | 'viewer' | 'unknown'

/** Deny-first: only a resolved, exactly-"admin" role may edit infrastructure. */
export function canEditInfrastructureForRole(role: unknown): boolean {
  return role === 'admin'
}

export function deriveRoleState(resolved: boolean, user: { role?: unknown } | null | undefined): AuthRoleState {
  if (!resolved) return 'loading'
  if (!user) return 'anonymous'
  if (user.role === 'admin') return 'admin'
  if (user.role === 'viewer') return 'viewer'
  return 'unknown'
}

/** Extract an HTTP status from $fetch/h3/fetch-style errors. */
export function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as { statusCode?: unknown; status?: unknown; response?: { status?: unknown } }
  for (const v of [e.statusCode, e.status, e.response?.status]) {
    if (typeof v === 'number') return v
  }
  return undefined
}

/** Only an explicit 401/404 from auth/me ends the session; network/5xx keep the last user. */
export function isDefinitiveAuthFailure(error: unknown): boolean {
  const s = getErrorStatus(error)
  return s === 401 || s === 404
}

/** Routes that never trigger auth/me refresh. */
export function isPublicAuthPath(path: string): boolean {
  return path.startsWith('/p/') || path === '/setup' || path === '/login'
}
