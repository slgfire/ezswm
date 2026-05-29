import type { IpAllocationEnriched, IPAllocation } from '~~/types/ipAllocation'

/**
 * Site-wide IP allocation overview. Reads the aggregated, enriched list from the
 * site-scoped endpoint; mutations reuse the existing per-network allocation endpoints
 * (an allocation always belongs to exactly one network).
 */
export function useSiteIpAllocations() {
  const items = ref<IpAllocationEnriched[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(siteId: string) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: IpAllocationEnriched[] } & IpAllocationEnriched[]>(
        `/api/sites/${siteId}/ip-allocations`
      )
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(networkId: string, body: Partial<IPAllocation>) {
    return await apiFetch<IPAllocation>(`/api/networks/${networkId}/allocations`, { method: 'POST', body })
  }

  async function update(networkId: string, allocId: string, body: Partial<IPAllocation>) {
    return await apiFetch<IPAllocation>(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'PUT', body })
  }

  async function remove(networkId: string, allocId: string) {
    await apiFetch(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}
