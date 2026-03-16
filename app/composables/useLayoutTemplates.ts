export function useLayoutTemplates() {
  const items = ref<any[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await apiFetch<any>('/api/layout-templates', { params })
      items.value = data.data || data.items || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch('/api/layout-templates', { method: 'POST', body })
  }

  async function getById(id: string) {
    return await apiFetch(`/api/layout-templates/${id}`)
  }

  async function update(id: string, body: Record<string, any>) {
    return await apiFetch(`/api/layout-templates/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/layout-templates/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, getById, update, remove }
}
