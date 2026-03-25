export function useSites() {
  const items = ref<any[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>('/api/sites', { params })
      items.value = data?.data || data || []
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data: any) {
    const result = await apiFetch('/api/sites', { method: 'POST', body: data })
    await fetch()
    return result
  }

  async function update(id: string, data: any) {
    const result = await apiFetch(`/api/sites/${id}`, { method: 'PUT', body: data })
    await fetch()
    return result
  }

  async function remove(id: string) {
    await apiFetch(`/api/sites/${id}`, { method: 'DELETE' })
    await fetch()
  }

  async function getById(id: string) {
    return await apiFetch(`/api/sites/${id}`)
  }

  return { items, loading, fetch, create, update, remove, getById }
}
