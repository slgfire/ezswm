import type { LAGGroup } from '~~/types/lagGroup'

export function useLagGroups(switchId: Ref<string> | string) {
  const items = ref<LAGGroup[]>([])
  const loading = ref(false)
  const { apiFetch } = useApiFetch()

  const resolvedId = computed(() => typeof switchId === 'string' ? switchId : switchId.value)

  async function fetch() {
    loading.value = true
    try {
      items.value = await apiFetch(`/api/switches/${resolvedId.value}/lag-groups`)
    } finally {
      loading.value = false
    }
  }

  async function create(body: { name: string; port_ids: string[]; description?: string; remote_device?: string; remote_device_id?: string }) {
    const result = await apiFetch<LAGGroup>(`/api/switches/${resolvedId.value}/lag-groups`, { method: 'POST', body })
    await fetch()
    return result
  }

  async function update(lagId: string, body: Partial<Pick<LAGGroup, 'name' | 'port_ids' | 'description' | 'remote_device' | 'remote_device_id'>>) {
    const result = await apiFetch<LAGGroup>(`/api/switches/${resolvedId.value}/lag-groups/${lagId}`, { method: 'PUT', body })
    await fetch()
    return result
  }

  async function remove(lagId: string) {
    await apiFetch(`/api/switches/${resolvedId.value}/lag-groups/${lagId}`, { method: 'DELETE' })
    await fetch()
  }

  // O(1) lookup by LAG ID
  const lagById = computed(() => {
    const map = new Map<string, LAGGroup>()
    for (const lag of items.value) map.set(lag.id, lag)
    return map
  })

  // O(1) lookup by port ID → which LAG is this port in?
  const lagByPortId = computed(() => {
    const map = new Map<string, LAGGroup>()
    for (const lag of items.value) {
      for (const portId of lag.port_ids) {
        map.set(portId, lag)
      }
    }
    return map
  })

  return { items, loading, fetch, create, update, remove, lagById, lagByPortId }
}
