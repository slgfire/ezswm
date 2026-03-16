export function useUsers() {
  const items = ref<any[]>([])
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      items.value = await $fetch('/api/users')
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await $fetch('/api/users', { method: 'POST', body })
  }

  async function update(id: string, body: Record<string, any>) {
    return await $fetch(`/api/users/${id}`, { method: 'PUT', body })
  }

  async function changePassword(id: string, body: { current_password: string; new_password: string }) {
    return await $fetch(`/api/users/${id}/password`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, changePassword, remove }
}
