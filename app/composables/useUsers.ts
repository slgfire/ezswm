export function useUsers() {
  const items = ref<any[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    try {
      items.value = await apiFetch('/api/users')
    } finally {
      loading.value = false
    }
  }

  async function create(body: Record<string, any>) {
    return await apiFetch('/api/users', { method: 'POST', body })
  }

  async function update(id: string, body: Record<string, any>) {
    return await apiFetch(`/api/users/${id}`, { method: 'PUT', body })
  }

  async function changePassword(id: string, body: { current_password: string; new_password: string }) {
    return await apiFetch(`/api/users/${id}/password`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, changePassword, remove }
}
