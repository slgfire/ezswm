import type { ActivityEntry } from '~~/types/activity'

export function useActivityLog(entityId: string) {
  const activities = ref<ActivityEntry[]>([])
  const { apiFetch } = useApiFetch()

  async function fetchActivity() {
    try {
      const data = await apiFetch<{ data?: ActivityEntry[] }>('/api/activity', {
        params: { entity_id: entityId, limit: 20 }
      })
      activities.value = data.data || []
    } catch { /* ignore */ }
  }

  return { activities, fetchActivity }
}
