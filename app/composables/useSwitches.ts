import type { Switch } from '~~/types/switch'
import type { Port } from '~~/types/port'

export function useSwitches() {
  const items = ref<Switch[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: Switch[]; meta?: { total?: number }; total?: number } & Switch[]>('/api/switches', { params })
      items.value = data?.data || data || []
      total.value = data?.meta?.total || data?.total || items.value.length
    } catch {
      // Auth redirect or network error — keep existing items
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<Switch>) {
    return await apiFetch<Switch>('/api/switches', { method: 'POST', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/switches/${id}`, { method: 'DELETE' })
  }

  async function duplicate(id: string) {
    return await apiFetch<Switch>(`/api/switches/${id}/duplicate`, { method: 'POST' })
  }

  return { items, total, loading, fetch, create, remove, duplicate }
}

export function useSwitch(id: string) {
  const item = ref<Switch | null>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    const isRefresh = !!item.value
    if (!isRefresh) loading.value = true
    try {
      item.value = await apiFetch<Switch>(`/api/switches/${id}`)
    } finally {
      if (!isRefresh) loading.value = false
    }
  }

  async function update(body: Partial<Switch>) {
    item.value = await apiFetch<Switch>(`/api/switches/${id}`, { method: 'PUT', body })
    return item.value
  }

  async function updatePort(portId: string, body: Partial<Port>) {
    return await apiFetch<Port>(`/api/switches/${id}/ports/${portId}`, { method: 'PUT', body })
  }

  async function bulkUpdatePorts(portIds: string[], updates: Partial<Port>) {
    return await apiFetch<{ updated: number }>(`/api/switches/${id}/ports/bulk`, { method: 'PUT', body: { port_ids: portIds, updates } })
  }

  return { item, loading, fetch, update, updatePort, bulkUpdatePorts }
}
