export function useNetworks() {
  const items = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>('/api/networks', { params })
      items.value = data.data || data
      total.value = data.meta?.total || data.total || items.value.length
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch('/api/networks', { method: 'POST', body })
  }

  async function update(id: string, body: Record<string, any>) {
    return await apiFetch(`/api/networks/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/networks/${id}`, { method: 'DELETE' })
  }

  return { items, total, loading, fetch, create, update, remove }
}

export function useIpAllocations(networkId: string) {
  const items = ref<any[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>(`/api/networks/${networkId}/allocations`, { params })
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch(`/api/networks/${networkId}/allocations`, { method: 'POST', body })
  }

  async function update(allocId: string, body: Record<string, any>) {
    return await apiFetch(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'PUT', body })
  }

  async function remove(allocId: string) {
    await apiFetch(`/api/networks/${networkId}/allocations/${allocId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}

export function useIpRanges(networkId: string) {
  const items = ref<any[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>(`/api/networks/${networkId}/ranges`, { params })
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch(`/api/networks/${networkId}/ranges`, { method: 'POST', body })
  }

  async function update(rangeId: string, body: Record<string, any>) {
    return await apiFetch(`/api/networks/${networkId}/ranges/${rangeId}`, { method: 'PUT', body })
  }

  async function remove(rangeId: string) {
    await apiFetch(`/api/networks/${networkId}/ranges/${rangeId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}
