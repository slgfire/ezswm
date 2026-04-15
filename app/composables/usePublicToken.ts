import type { PublicToken } from '~~/types/publicToken'

export function usePublicToken(switchId: Ref<string> | string) {
  const id = toValue(switchId)
  const token = ref<PublicToken | null>(null)
  const loading = ref(false)

  async function fetchToken() {
    loading.value = true
    try {
      const data = await $fetch<PublicToken>(`/api/switches/${id}/public-token`)
      token.value = data
    } catch (e: any) {
      if (e?.statusCode === 404) {
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
        method: 'POST'
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
        method: 'DELETE'
      })
      await fetchToken()
    } finally {
      loading.value = false
    }
  }

  return { token, loading, fetchToken, createToken, revokeToken }
}
