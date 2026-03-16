export function useVlans() {
  const items = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)

  async function fetch(params?: Record<string, any>) {
    loading.value = true
    try {
      const data = await $fetch<any>('/api/vlans', { params })
      items.value = data.data || data
      total.value = data.total || items.value.length
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await $fetch('/api/vlans', { method: 'POST', body })
  }

  async function update(id: string, body: Record<string, any>) {
    return await $fetch(`/api/vlans/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await $fetch(`/api/vlans/${id}`, { method: 'DELETE' })
  }

  async function getReferences(id: string) {
    return await $fetch(`/api/vlans/${id}/references`)
  }

  return { items, total, loading, fetch, create, update, remove, getReferences }
}
