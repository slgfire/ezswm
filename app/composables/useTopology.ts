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
  const { canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let queuedPositions: Record<string, { x: number; y: number }> | null = null
  let saveGeneration = 0
  let resetInProgress = false
  const activeSaves = new Set<Promise<void>>()

  function cancelQueuedSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    queuedPositions = null
    saveGeneration++
  }

  watch(canEditInfrastructure, (allowed) => {
    if (!allowed) cancelQueuedSave()
  })
  watch(id, cancelQueuedSave)
  onBeforeUnmount(cancelQueuedSave)

  async function showMutationError(cause: unknown) {
    const access = await handleInfrastructureForbidden(cause)
    if (access === 'demoted') {
      cancelQueuedSave()
      toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
      return
    }
    if (access === 'already-handled') {
      cancelQueuedSave()
      return
    }

    // Do not let a later queued drag silently retry a failed write.
    cancelQueuedSave()
    const err = cause as { statusMessage?: string; data?: { message?: string } }
    toast.add({ title: err.data?.message || err.statusMessage || t('errors.serverError'), color: 'error' })
  }

  async function fetchTopology() {
    loading.value = true
    error.value = null
    try {
      const [topoData, layoutData] = await Promise.all([
        apiFetch<TopologyData>(`/api/sites/${id.value}/topology`),
        apiFetch<TopologyLayout>(`/api/sites/${id.value}/topology-layout`)
      ])
      data.value = topoData
      layout.value = layoutData
    } catch (e: unknown) {
      error.value = (e as Error).message || 'Failed to load topology'
    } finally {
      loading.value = false
    }
  }

  async function persistLayout(positions: Record<string, { x: number; y: number }>, generation: number) {
    if (!canEditInfrastructure.value || resetInProgress || generation !== saveGeneration) return
    try {
      await apiFetch(`/api/sites/${id.value}/topology-layout`, {
        method: 'PUT',
        body: { node_positions: positions }
      })
    } catch (cause: unknown) {
      await showMutationError(cause)
    }
  }

  function saveLayout(positions: Record<string, { x: number; y: number }>) {
    if (!canEditInfrastructure.value || resetInProgress) return
    queuedPositions = positions
    if (saveTimer) clearTimeout(saveTimer)
    const generation = saveGeneration
    saveTimer = setTimeout(() => {
      saveTimer = null
      const latestPositions = queuedPositions
      queuedPositions = null
      if (latestPositions && canEditInfrastructure.value && generation === saveGeneration) {
        const pendingSave = persistLayout(latestPositions, generation)
        activeSaves.add(pendingSave)
        void pendingSave.finally(() => activeSaves.delete(pendingSave))
      }
    }, 250)
  }

  async function resetLayout(): Promise<boolean> {
    if (!canEditInfrastructure.value || resetInProgress) return false
    // Block new autosaves synchronously, before anything is cancelled/awaited.
    resetInProgress = true
    try {
      cancelQueuedSave()
      const siteIdAtRequest = id.value
      // Let already-dispatched position saves settle before deleting the saved
      // layout, so an older autosave cannot recreate it after reset.
      await Promise.all([...activeSaves])
      if (id.value !== siteIdAtRequest || !canEditInfrastructure.value) return false
      await apiFetch(`/api/sites/${siteIdAtRequest}/topology-layout`, {
        method: 'DELETE'
      })
      if (id.value !== siteIdAtRequest) return false
      layout.value = null
      return true
    } catch (cause: unknown) {
      await showMutationError(cause)
      return false
    } finally {
      resetInProgress = false
    }
  }

  return { data, layout, loading, error, fetchTopology, saveLayout, resetLayout }
}
