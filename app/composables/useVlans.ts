export function useVlans() {
  const items = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>('/api/vlans', { params })
      items.value = data?.data || data || []
      total.value = data?.meta?.total || data?.total || items.value.length
    } catch { /* ignore */
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch('/api/vlans', { method: 'POST', body })
  }

  async function update(id: string, body: Record<string, any>) {
    return await apiFetch(`/api/vlans/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/vlans/${id}`, { method: 'DELETE' })
  }

  async function getReferences(id: string) {
    return await apiFetch(`/api/vlans/${id}/references`)
  }

  return { items, total, loading, fetch, create, update, remove, getReferences }
}
