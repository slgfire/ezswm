interface ApiTokenMetadata {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
}

interface ApiTokenCreated extends ApiTokenMetadata {
  token: string
}

export function useApiTokens() {
  const tokens = ref<ApiTokenMetadata[]>([])
  const loading = ref(false)
  const loadFailed = ref(false)
  const { apiFetch } = useApiFetch()
  let generation = 0

  async function fetch() {
    const current = ++generation
    loading.value = true
    try {
      const result = await apiFetch<ApiTokenMetadata[]>('/api/auth/tokens')
      if (current !== generation) return false
      tokens.value = result
      loadFailed.value = false
      return true
    } catch {
      if (current === generation) loadFailed.value = true
      return false
    } finally {
      if (current === generation) loading.value = false
    }
  }

  async function create(body: { name: string, expires_at?: string }) {
    const current = generation
    const created = await apiFetch<ApiTokenCreated>('/api/auth/tokens', { method: 'POST', body })
    const { token, ...metadata } = created
    if (current === generation) tokens.value = [metadata, ...tokens.value.filter(item => item.id !== metadata.id)]
    return token
  }

  async function revoke(id: string) {
    const current = generation
    await apiFetch<unknown>(`/api/auth/tokens/${id}`, { method: 'DELETE' })
    if (current === generation) tokens.value = tokens.value.filter(token => token.id !== id)
  }

  async function revokeAll() {
    const current = generation
    await apiFetch<unknown>('/api/auth/tokens', { method: 'DELETE' })
    if (current === generation) tokens.value = []
  }

  function reset() {
    generation++
    tokens.value = []
    loading.value = false
    loadFailed.value = false
  }

  return { tokens, loading, loadFailed, fetch, create, revoke, revokeAll, reset }
}
