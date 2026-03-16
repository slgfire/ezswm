export function useLagGroups(switchId: string) {
  const items = ref<any[]>([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      items.value = await $fetch(`/api/switches/${switchId}/lag-groups`)
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await $fetch(`/api/switches/${switchId}/lag-groups`, { method: 'POST', body })
  }

  async function update(lagId: string, body: Record<string, any>) {
    return await $fetch(`/api/switches/${switchId}/lag-groups/${lagId}`, { method: 'PUT', body })
  }

  async function remove(lagId: string) {
    await $fetch(`/api/switches/${switchId}/lag-groups/${lagId}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, remove }
}
