import type { LayoutTemplate } from '~~/types/layoutTemplate'

export function useLayoutTemplates() {
  const items = ref<LayoutTemplate[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch(params?: Record<string, string | number | boolean | undefined>) {
    loading.value = true
    try {
      const data = await apiFetch<{ data?: LayoutTemplate[]; items?: LayoutTemplate[] } & LayoutTemplate[]>('/api/layout-templates', { params })
      items.value = data?.data || data?.items || data || []
    } catch { /* ignore */
    } finally {
      loading.value = false
    }
  }

  async function create(body: Partial<LayoutTemplate>) {
    return await apiFetch<LayoutTemplate>('/api/layout-templates', { method: 'POST', body })
  }

  async function getById(id: string) {
    return await apiFetch<LayoutTemplate>(`/api/layout-templates/${id}`)
  }

  async function update(id: string, body: Partial<LayoutTemplate>) {
    return await apiFetch<LayoutTemplate>(`/api/layout-templates/${id}`, { method: 'PUT', body })
  }

  async function remove(id: string) {
    await apiFetch(`/api/layout-templates/${id}`, { method: 'DELETE' })
  }

  return { items, loading, fetch, create, getById, update, remove }
}
