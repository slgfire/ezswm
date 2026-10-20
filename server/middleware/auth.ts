import { getCredentialFromEvent, verifyToken } from '../utils/auth'
import { evaluateApiTokenPolicy, evaluateRolePolicy, normalizePolicyPath } from '../utils/requireAdmin'
import { userRepository } from '../repositories/userRepository'
import { apiTokenRepository } from '../repositories/apiTokenRepository'
import { API_TOKEN_PREFIX } from '../../types/apiToken'
import { oidcConfigRepository } from '../repositories/oidcConfigRepository'
import { isOidcEffectivelyEnabled, isOidcSessionCurrent, readOidcRuntimeSettings } from '../utils/oidc/session'

const PUBLIC_PATHS = [
  '/api/auth/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/oidc/status',
  '/api/auth/oidc/start',
  '/api/auth/oidc/callback',
  '/api/health',
  '/api/setup/status',
  '/api/changelog',
  '/api/version-latest'
]

export default defineEventHandler(async (event) => {
  const rawPath = getRequestPath(event)
  const method = getMethod(event)
  const path = normalizePolicyPath(rawPath)

  // Only apply to API routes
  if (!path.startsWith('/api/')) return

  // Public API routes with dynamic segments
  if (path.startsWith('/api/p/')) return

  // Nuxt internal APIs (icons, etc.)
  if (path.startsWith('/api/_')) return

  // Skip public paths (exact match)
  if (PUBLIC_PATHS.includes(path)) return

  // Allow GET /api/settings (for setup check; contains no secrets)
  if (path === '/api/settings' && method === 'GET') return

  const credential = getCredentialFromEvent(event)
  if (credential.kind === 'none') {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }
  // Malformed/non-Bearer Authorization header: no fallback to a cookie.
  if (credential.kind === 'invalid') {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  if (credential.token.startsWith(API_TOKEN_PREFIX)) {
    // API tokens are header-only; one in the session cookie is never valid.
    if (credential.kind !== 'header') {
      throw createError({ statusCode: 401, message: 'Invalid or expired token' })
    }
    const apiToken = await apiTokenRepository.authenticate(credential.token)
    // Role + owner existence come from the DB per request; local accounts only (defensive).
    const owner = apiToken ? await userRepository.getById(apiToken.user_id) : null
    if (!apiToken || !owner || owner.auth_provider !== 'local') {
      throw createError({ statusCode: 401, message: 'Invalid or expired token' })
    }
    if (
      evaluateApiTokenPolicy({ method, path }) !== 'allow'
      || evaluateRolePolicy({ role: owner.role, method, path, userId: owner.id }) !== 'allow'
    ) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }
    event.context.auth = {
      userId: owner.id,
      username: owner.username,
      role: owner.role,
      authProvider: owner.auth_provider,
      authType: 'api_token',
      apiTokenId: apiToken.id,
      apiTokenName: apiToken.name
    }
    return
  }

  const token = credential.token

  let payload: ReturnType<typeof verifyToken>
  try {
    payload = verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  // The DB is the authority for existence and role; the token only proves identity.
  const user = typeof payload.sub === 'string' ? await userRepository.getById(payload.sub) : null
  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  if (user.auth_provider === 'oidc') {
    // OIDC sessions die when SSO is disabled/unusable (key missing/wrong), the config
    // revision changes, or the identity's session version was bumped.
    const config = await oidcConfigRepository.get()
    if (
      !isOidcEffectivelyEnabled(config, readOidcRuntimeSettings())
      || !isOidcSessionCurrent(user, payload, config)
    ) {
      throw createError({ statusCode: 401, message: 'Invalid or expired token' })
    }
  } else if (payload.ap === 'oidc') {
    // A token claiming OIDC provenance for a local account is never valid.
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  if (evaluateRolePolicy({ role: user.role, method, path, userId: user.id }) !== 'allow') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  event.context.auth = {
    userId: user.id,
    username: user.username,
    role: user.role,
    authProvider: user.auth_provider,
    authType: 'jwt'
  }
})
