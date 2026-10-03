import { beginOidcLogin, bindingCookieOptions, OIDC_BINDING_COOKIE, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import { resolveOidcCallbackUrl } from '../../../utils/oidc/client'
import { getRequestOrigin } from '../../../utils/auth'

// Public. Starts Authorization Code + PKCE. The browser binding cookie is stable:
// only set when absent/invalid. Canonical origin = PUBLIC_BASE_URL or the request origin
// (X-Forwarded-* is NOT trusted). Too many pending attempts → 429 is passed through.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const settings = readOidcRuntimeSettings()
  const requestOrigin = getRequestOrigin(event)

  const query = getQuery(event)
  const returnTo = typeof query.return_to === 'string' ? query.return_to : undefined

  const result = await beginOidcLogin({
    settings,
    requestOrigin,
    existingBinding: getCookie(event, OIDC_BINDING_COOKIE),
    returnTo
  })

  if (!result.ok) {
    return sendRedirect(event, `/login?oidc_error=${encodeURIComponent(result.code)}`, 302)
  }

  if (result.bindingIsNew) {
    const secure = resolveOidcCallbackUrl(settings.publicBaseUrl, requestOrigin).startsWith('https://')
    setCookie(event, OIDC_BINDING_COOKIE, result.bindingValue, bindingCookieOptions(secure))
  }
  return sendRedirect(event, result.redirectUrl, 302)
})
