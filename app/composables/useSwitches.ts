import type { Switch } from '~~/types/switch'
import type { Port } from '~~/types/port'

export function useSwitches() {
  const items = ref<Switch[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()
  const { canEditInfrastructure } = useAuth()

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
    if (!canEditInfrastructure.value) return
    return await apiFetch<Switch>('/api/switches', { method: 'POST', body })
  }

  async function remove(id: string) {
    if (!canEditInfrastructure.value) return
    await apiFetch(`/api/switches/${id}`, { method: 'DELETE' })
  }

  async function duplicate(id: string) {
    if (!canEditInfrastructure.value) return
    return await apiFetch<Switch>(`/api/switches/${id}/duplicate`, { method: 'POST' })
  }

  return { items, total, loading, fetch, create, remove, duplicate }
}

export function useSwitch(id: string, siteId?: string) {
  const item = ref<Switch | null>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()
  const { canEditInfrastructure } = useAuth()

  // Site context disambiguates per-site-unique slugs (a switch named "sw-core"
  // can exist on multiple sites). Pages on /sites/<site>/switches/<switch>
  // should pass route.params.siteId so the backend resolves the right one.
  const params = siteId ? { siteId } : undefined

  async function fetch() {
    const isRefresh = !!item.value
    if (!isRefresh) loading.value = true
    try {
      item.value = await apiFetch<Switch>(`/api/switches/${id}`, { params })
    } finally {
      if (!isRefresh) loading.value = false
    }
  }

  async function update(body: Partial<Switch>) {
    if (!canEditInfrastructure.value) return item.value
    item.value = await apiFetch<Switch>(`/api/switches/${id}`, { method: 'PUT', body, params })
    return item.value
  }

  async function updatePort(portId: string, body: Partial<Port>) {
    if (!canEditInfrastructure.value) return
    return await apiFetch<Port>(`/api/switches/${id}/ports/${portId}`, { method: 'PUT', body, params })
  }

  async function bulkUpdatePorts(portIds: string[], updates: Partial<Port>) {
    if (!canEditInfrastructure.value) return
    return await apiFetch<{ updated: number }>(`/api/switches/${id}/ports/bulk`, { method: 'PUT', body: { port_ids: portIds, updates }, params })
  }

  return { item, loading, fetch, update, updatePort, bulkUpdatePorts }
}
