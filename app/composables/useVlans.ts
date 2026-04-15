import type { VLAN } from '~~/types/vlan'

export function useVlans() {
  const items = ref<VLAN[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: VLAN[]; meta?: { total?: number }; total?: number } & VLAN[]>('/api/vlans', { params })
      items.value = data?.data || data || []
      total.value = data?.meta?.total || data?.total || items.value.length
    } catch { /* ignore */
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<VLAN>) {
    return await apiFetch<VLAN>('/api/vlans', { method: 'POST', body })
  }

  async function update(id: string, body: Partial<VLAN>) {
    return await apiFetch<VLAN>(`/api/vlans/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/vlans/${id}`, { method: 'DELETE' })
  }

  async function getReferences(id: string) {
    return await apiFetch<{ switches: string[]; networks: string[] }>(`/api/vlans/${id}/references`)
  }

  return { items, total, loading, fetch, create, update, remove, getReferences }
}
