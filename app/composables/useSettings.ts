import type { AppSettings } from '~~/types/settings'

export function useSettings() {
  const settings = ref<AppSettings | null>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    try {
      settings.value = await apiFetch<AppSettings>('/api/settings')
    } finally {
      loading.value = false
    }
  }

  async function update(body: Partial<AppSettings>) {
    settings.value = await apiFetch<AppSettings>('/api/settings', { method: 'PUT', body })
    return settings.value
  }

  return { settings, loading, fetch, update }
}
