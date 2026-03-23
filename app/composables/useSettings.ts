export function useSettings() {
  const settings = ref<any>(null)
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    try {
      settings.value = await apiFetch('/api/settings')
    } finally {
      loading.value = false
    }
  }

  async function update(body: Record<string, any>) {
    settings.value = await apiFetch('/api/settings', { method: 'PUT', body })
    return settings.value
  }

  return { settings, loading, fetch, update }
}
