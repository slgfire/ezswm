import type { TopologyNode, TopologyLink, TopologyGhostNode, TopologyLayout } from '~~/types/topology'

interface TopologyData {
  nodes: TopologyNode[]
  links: TopologyLink[]
  ghost_nodes: TopologyGhostNode[]
}

export function useTopology(siteId: Ref<string> | string) {
  const id = computed(() => toValue(siteId))

  const data = ref<TopologyData | null>(null)
  const layout = ref<TopologyLayout | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { apiFetch } = useApiFetch()

  async function fetchTopology() {
    loading.value = true
    error.value = null
    try {
      const [topoData, layoutData] = await Promise.all([
        apiFetch<TopologyData>(`/api/sites/${id.value}/topology`),
        apiFetch<TopologyLayout>(`/api/sites/${id.value}/topology/layout`)
      ])
      data.value = topoData
      layout.value = layoutData
    } catch (e: unknown) {
      error.value = (e as Error).message || 'Failed to load topology'
    } finally {
      loading.value = false
    }
  }

  async function saveLayout(positions: Record<string, { x: number; y: number }>) {
    try {
      await apiFetch(`/api/sites/${id.value}/topology/layout`, {
        method: 'PUT',
        body: { node_positions: positions }
      })
    } catch {
      // Layout save is best-effort, don't disrupt UX
    }
  }

  async function resetLayout() {
    try {
      await apiFetch(`/api/sites/${id.value}/topology/layout`, {
        method: 'DELETE'
      })
      layout.value = null
    } catch {
      // Best effort
    }
  }

  return { data, layout, loading, error, fetchTopology, saveLayout, resetLayout }
}
