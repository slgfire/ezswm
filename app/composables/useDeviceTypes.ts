import type { CustomDeviceType } from '~~/types/ipAllocation'

export function useDeviceTypes() {
  const items = useState<CustomDeviceType[]>('custom-device-types', () => [])
  const loading = useState<boolean>('custom-device-types-loading', () => false)
  const loadError = useState<boolean>('custom-device-types-load-error', () => false)
  const { apiFetch } = useApiFetch()

  async function fetch() {
    loading.value = true
    loadError.value = false
    try {
      items.value = await apiFetch<CustomDeviceType[]>('/api/device-types')
      return true
    } catch {
      // Keep the last good list so a temporary failure never hides existing categories.
      loadError.value = true
      return false
    } finally {
      loading.value = false
    }
  }

  async function create(name: string) {
    const type = await apiFetch<CustomDeviceType>('/api/device-types', { method: 'POST', body: { name } })
    items.value = [...items.value, type]
    loadError.value = false
    return type
  }

  async function update(id: string, body: { name?: string; active?: boolean }) {
    const type = await apiFetch<CustomDeviceType>(`/api/device-types/${id}`, { method: 'PUT', body })
    items.value = items.value.map(item => item.id === id ? type : item)
    loadError.value = false
    return type
  }

  return { items, loading, loadError, fetch, create, update }
}
