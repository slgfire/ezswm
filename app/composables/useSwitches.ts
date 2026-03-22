export function useSwitches() {
  const items = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>('/api/switches', { params })
      items.value = data?.data || data || []
      total.value = data?.meta?.total || data?.total || items.value.length
    } catch {
      // Auth redirect or network error — keep existing items
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch('/api/switches', { method: 'POST', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/switches/${id}`, { method: 'DELETE' })
  }

  async function duplicate(id: string) {
    return await apiFetch(`/api/switches/${id}/duplicate`, { method: 'POST' })
  }

  return { items, total, loading, fetch, create, remove, duplicate }
}

export function useSwitch(id: string) {
  const item = ref<any>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    try {
      item.value = await apiFetch(`/api/switches/${id}`)
    } finally {
      loading.value = false
    }
  }

  async function update(body: Record<string, any>) {
    item.value = await apiFetch(`/api/switches/${id}`, { method: 'PUT', body })
    return item.value
  }

  async function updatePort(portId: string, body: Record<string, any>) {
    return await apiFetch(`/api/switches/${id}/ports/${portId}`, { method: 'PUT', body })
  }

  async function bulkUpdatePorts(portIds: string[], updates: Record<string, any>) {
    return await apiFetch(`/api/switches/${id}/ports/bulk`, { method: 'PUT', body: { port_ids: portIds, updates } })
  }

  return { item, loading, fetch, update, updatePort, bulkUpdatePorts }
}
