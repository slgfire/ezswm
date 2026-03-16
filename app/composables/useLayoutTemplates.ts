export function useLayoutTemplates() {
  const items = ref<any[]>([])
  const loading = ref(false)

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await $fetch<any>('/api/layout-templates', { params })
      items.value = data.data || data
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await $fetch('/api/layout-templates', { method: 'POST', body })
  }

  async function getById(id: string) {
    return await $fetch(`/api/layout-templates/${id}`)
  }

  async function update(id: string, body: Record<string, any>) {
    return await $fetch(`/api/layout-templates/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await $fetch(`/api/layout-templates/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, getById, update, remove }
}
