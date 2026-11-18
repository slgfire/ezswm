import type { H3Event } from 'h3'
import { parsePublicBaseUrl } from './oidc/client'

/** Check browser-originated writes. CLI requests without browser headers remain supported. */
export function assertBrowserMutationOrigin(event: H3Event): void {
  const fetchSite = getHeader(event, 'sec-fetch-site')
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request denied' })
  }

  const origin = getHeader(event, 'origin')
  if (origin === undefined) return
  const publicOrigin = parsePublicBaseUrl(useRuntimeConfig().publicBaseUrl)
  // Use the request Host, never X-Forwarded-Host. TLS proxies can supply the scheme.
  const requestOrigin = getRequestURL(event, { xForwardedHost: false }).origin
  if (origin !== requestOrigin && origin !== publicOrigin) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request denied' })
  }
}
