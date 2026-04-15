import type { Network } from '~~/types/network'
import type { IPAllocation } from '~~/types/ipAllocation'
import type { IPRange } from '~~/types/ipRange'

export function useNetworks() {
  const items = ref<Network[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: Network[]; meta?: { total?: number }; total?: number } & Network[]>('/api/networks', { params })
      items.value = data?.data || data || []
      total.value = data?.meta?.total || data?.total || items.value.length
    } catch { /* ignore */
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<Network>) {
    return await apiFetch<Network>('/api/networks', { method: 'POST', body })
  }

  async function update(id: string, body: Partial<Network>) {
    return await apiFetch<Network>(`/api/networks/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/networks/${id}`, { method: 'DELETE' })
  }

  return { items, total, loading, fetch, create, update, remove }
}

export function useIpAllocations(networkId: string) {
  const items = ref<IPAllocation[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: IPAllocation[] } & IPAllocation[]>(`/api/networks/${networkId}/allocations`, { params })
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<IPAllocation>) {
    return await apiFetch<IPAllocation>(`/api/networks/${networkId}/allocations`, { method: 'POST', body })
  }

  async function update(allocId: string, body: Partial<IPAllocation>) {
    return await apiFetch<IPAllocation>(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'PUT', body })
  }

  async function remove(allocId: string) {
    await apiFetch(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}

export function useIpRanges(networkId: string) {
  const items = ref<IPRange[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: IPRange[] } & IPRange[]>(`/api/networks/${networkId}/ranges`, { params })
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<IPRange>) {
    return await apiFetch<IPRange>(`/api/networks/${networkId}/ranges`, { method: 'POST', body })
  }

  async function update(rangeId: string, body: Partial<IPRange>) {
    return await apiFetch<IPRange>(`/api/networks/${networkId}/ranges/${rangeId}`, { method: 'PUT', body })
  }

  async function remove(rangeId: string) {
    await apiFetch(`/api/networks/${networkId}/ranges/${rangeId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}
