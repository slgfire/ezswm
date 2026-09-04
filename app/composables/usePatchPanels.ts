import type { PatchPanel, PatchPanelSocket } from '~~/types/patchPanel'

export function usePatchPanels() {
  const items = ref<PatchPanel[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: PatchPanel[]; meta?: { total?: number } }>('/api/patch-panels', { params })
      items.value = data?.data || []
      total.value = data?.meta?.total || items.value.length
    } catch {
      // Feature disabled (404) or auth redirect — keep existing items
    } finally {
      loading.value = false
    }
  }

  async function create(body: { site_id: string; name: string; description?: string; port_count: number }) {
    return await apiFetch<PatchPanel>('/api/patch-panels', { method: 'POST', body })
  }

  async function update(id: string, body: { name?: string; description?: string | null }, siteId?: string) {
    return await apiFetch<PatchPanel>(`/api/patch-panels/${id}`, {
      method: 'PUT',
      body,
      params: siteId ? { siteId } : undefined
    })
  }

  async function remove(id: string, siteId?: string) {
    await apiFetch(`/api/patch-panels/${id}`, {
      method: 'DELETE',
      params: siteId ? { siteId } : undefined
    })
  }

  return { items, total, loading, fetch, create, update, remove }
}

export function usePatchPanel(idOrSlug: string, siteId?: string) {
  const item = ref<PatchPanel | null>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  const params = siteId ? { siteId } : undefined

  async function fetch() {
    const isRefresh = !!item.value
    if (!isRefresh) loading.value = true
    try {
      item.value = await apiFetch<PatchPanel>(`/api/patch-panels/${idOrSlug}`, { params })
    } finally {
      if (!isRefresh) loading.value = false
    }
  }

  async function updateSocket(socketId: string, body: { outlet_number?: string | null; location?: string | null; tested?: boolean }) {
    return await apiFetch<PatchPanelSocket>(`/api/patch-panels/${idOrSlug}/sockets/${socketId}`, {
      method: 'PUT',
      body,
      params
    })
  }

  return { item, loading, fetch, updateSocket }
}
