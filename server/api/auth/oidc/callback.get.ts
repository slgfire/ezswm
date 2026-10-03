import { buildOidcSessionClaims, completeOidcLogin, OIDC_BINDING_COOKIE, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import { resolveOidcCallbackUrl } from '../../../utils/oidc/client'
import { oidcCallbackQuerySchema, sanitizeReturnTo } from '../../../validators/oidcSchemas'
import { getRequestOrigin, setAuthCookie, signToken } from '../../../utils/auth'

function failure(event: Parameters<typeof sendRedirect>[0], code: string) {
  return sendRedirect(event, `/login?oidc_error=${encodeURIComponent(code)}`, 302)
}

// Public. Completes the login. The browser only ever sees a safe `oidc_error` code;
// details go to the server log (sanitized).
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const settings = readOidcRuntimeSettings()
  const requestOrigin = getRequestOrigin(event)

  const query = new URL(event.path, 'http://callback.invalid').searchParams
  // Reject duplicated protocol parameters (parameter pollution) and oversized values.
  for (const key of ['code', 'state', 'error', 'error_description', 'iss']) {
    if (query.getAll(key).length > 1) return failure(event, 'oidc_invalid_request')
  }
  const shape = oidcCallbackQuerySchema.safeParse(Object.fromEntries(query.entries()))
  if (!shape.success) return failure(event, 'oidc_invalid_request')

  const result = await completeOidcLogin({
    settings,
    requestOrigin,
    query,
    bindingValue: getCookie(event, OIDC_BINDING_COOKIE)
  })

  if (!result.ok) {
    const detail = String(result.detail ?? '').replace(/[^\w.-]/g, '_').slice(0, 64)
    console.warn(`[ezSWM] OIDC login failed: ${result.code}${detail ? ` (${detail})` : ''}`)
    return failure(event, result.code)
  }

  const { user } = result
  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    ...buildOidcSessionClaims(user, { config_revision: result.configRevision })
  })
  const secure = resolveOidcCallbackUrl(settings.publicBaseUrl, requestOrigin).startsWith('https://')
  setAuthCookie(event, token, false, secure)
  // The binding cookie is intentionally NOT deleted (multi-tab, stable binding).
  return sendRedirect(event, sanitizeReturnTo(result.returnTo), 302)
})
