import type { Site } from '~~/types/site'

export function useSites() {
  const items = ref<Site[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: Site[] } & Site[]>('/api/sites', { params })
      items.value = data?.data || data || []
    } catch {
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Site>) {
    const result = await apiFetch<Site>('/api/sites', { method: 'POST', body: data })
    await fetch()
    return result
  }

  async function update(id: string, data: Partial<Site>) {
    const result = await apiFetch<Site>(`/api/sites/${id}`, { method: 'PUT', body: data })
    await fetch()
    return result
  }

  async function remove(id: string) {
    await apiFetch(`/api/sites/${id}`, { method: 'DELETE' })
    await fetch()
  }

  async function getById(id: string) {
    return await apiFetch<Site>(`/api/sites/${id}`)
  }

  return { items, loading, fetch, create, update, remove, getById }
}
