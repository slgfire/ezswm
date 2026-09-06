import type { PublicToken } from '~~/types/publicToken'

/**
 * Fetch/create/revoke a public sharing token for an entity.
 *
 * `basePath` builds the API prefix, e.g.:
 *   usePublicToken(() => `/api/switches/${id}/public-token`)
 *   usePublicToken(() => `/api/patch-panels/${id}/public-token`)
 *
 * Legacy shorthand: pass a switchId string + optional siteId and it builds the
 * switch path automatically (backwards-compatible with existing callers).
 */
export function usePublicToken(
  switchIdOrPath: Ref<string> | string | (() => string),
  siteId?: Ref<string> | string
) {
  // Resolve the base API path
  const basePath = typeof switchIdOrPath === 'function'
    ? switchIdOrPath
    : () => `/api/switches/${toValue(switchIdOrPath as Ref<string> | string)}/public-token`

  const token = ref<PublicToken | null>(null)
  const loading = ref(false)

  // Site context disambiguates per-site-unique slugs.
  const query = () => {
    const sid = toValue(siteId)
    return sid ? { siteId: sid } : undefined
  }

  async function fetchToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(basePath(), { query: query() })
      token.value = data
    } catch (e: unknown) {
      if ((e as { statusCode?: number })?.statusCode === 404) {
        token.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function createToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(basePath(), {
        method: 'POST',
        query: query()
      })
      token.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  async function revokeToken() {
    loading.value = true
    try {
      await $fetch(basePath(), {
        method: 'DELETE',
        query: query()
      })
      await fetchToken()
    } finally {
      loading.value = false
    }
  }

  return { token, loading, fetchToken, createToken, revokeToken }
}
