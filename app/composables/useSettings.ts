export function useSettings() {
  const settings = ref<any>(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      settings.value = await $fetch('/api/settings')
    } finally {
      loading.value = false
    }
  }

  async function update(body: Record<string, any>) {
    settings.value = await $fetch('/api/settings', { method: 'PUT', body })
    return settings.value
  }

  return { settings, loading, fetch, update }
}
