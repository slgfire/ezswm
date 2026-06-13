import type { PublicToken } from '~~/types/publicToken'

export function usePublicToken(switchId: Ref<string> | string, siteId?: Ref<string> | string) {
  const id = toValue(switchId)
  const token = ref<PublicToken | null>(null)
  const loading = ref(false)

  // Site context disambiguates per-site-unique switch slugs.
  const query = () => {
    const sid = toValue(siteId)
    return sid ? { siteId: sid } : undefined
  }

  async function fetchToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(`/api/switches/${id}/public-token`, { query: query() })
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
      const data = await $fetch<PublicToken>(`/api/switches/${id}/public-token`, {
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
      await $fetch(`/api/switches/${id}/public-token`, {
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
