import type { User } from '~~/types/user'

export function useUsers() {
  const items = ref<User[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    try {
      items.value = await apiFetch<User[]>('/api/users')
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<User> & { password?: string }) {
    return await apiFetch<User>('/api/users', { method: 'POST', body })
  }

  async function update(id: string, body: Partial<User>) {
    return await apiFetch<User>(`/api/users/${id}`, { method: 'PUT', body })
  }

  async function changePassword(id: string, body: { current_password: string; new_password: string }) {
    return await apiFetch(`/api/users/${id}/password`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, update, changePassword, remove }
}
