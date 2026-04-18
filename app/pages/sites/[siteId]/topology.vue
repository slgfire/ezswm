<template>
  <div class="flex h-full overflow-hidden">
    <!-- Empty state: all sites -->
    <div v-if="isAllContext" class="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <UIcon name="i-heroicons-share" class="mb-4 h-16 w-16 text-gray-500" />
      <h2 class="mb-2 text-xl font-semibold text-gray-300">{{ $t('topology.selectSiteTitle') }}</h2>
      <p class="max-w-md text-sm text-gray-500">{{ $t('topology.selectSiteDescription') }}</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex flex-1 items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty state: no connections -->
    <div
      v-else-if="!data?.links.length"
      class="flex flex-1 flex-col items-center justify-center p-6 text-center"
    >
      <UIcon name="i-heroicons-share" class="mb-4 h-16 w-16 text-gray-500" />
      <h2 class="mb-2 text-xl font-semibold text-gray-300">{{ $t('topology.emptyTitle') }}</h2>
      <p class="max-w-md text-sm text-gray-500">{{ $t('topology.emptyDescription') }}</p>
    </div>

    <!-- Graph (full width, panel overlays via USlideover) -->
    <div v-else class="flex-1">
      <TopologyGraph
        ref="graphRef"
        :nodes="data!.nodes"
        :links="data!.links"
        :ghost-nodes="data!.ghost_nodes"
        :saved-positions="layout?.node_positions ?? null"
        :selected-node-id="selectedNodeId"
        :highlight-edge-id="highlightEdgeId"
        @select-node="onSelectNode"
        @select-edge="onSelectEdge"
        @positions-changed="onPositionsChanged"
        @reset="onReset"
      />
    </div>

    <!-- Detail panel (USlideover overlay) -->
    <TopologyDetailPanel
      v-if="data"
      :node="selectedNode"
      :links="data.links"
      :nodes="data.nodes"
      :ghost-nodes="data.ghost_nodes"
      :site-id="siteId"
      :highlight-edge-id="highlightEdgeId"
      @select-node="onSelectNode"
      @highlight-edge="onHighlightEdge"
      @close="onClosePanel"
    />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Topology' })

const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const isAllContext = computed(() => siteId.value === 'all')

const { data, layout, loading, fetchTopology, saveLayout, resetLayout } = useTopology(siteId)

const graphRef = ref<{ fitToContents: () => void } | null>(null)
const selectedNodeId = ref<string | null>(null)
const highlightEdgeId = ref<string | null>(null)

const selectedNode = computed(() => {
  if (!selectedNodeId.value || !data.value) return null
  return data.value.nodes.find(n => n.id === selectedNodeId.value) ?? null
})

function onSelectNode(nodeId: string) {
  if (!nodeId) {
    selectedNodeId.value = null
    highlightEdgeId.value = null
  } else {
    selectedNodeId.value = nodeId
    highlightEdgeId.value = null
  }
}

function onSelectEdge(edgeId: string) {
  highlightEdgeId.value = edgeId
}

function onHighlightEdge(edgeId: string) {
  highlightEdgeId.value = edgeId || null
}

function onClosePanel() {
  selectedNodeId.value = null
  highlightEdgeId.value = null
}

function onPositionsChanged(positions: Record<string, { x: number; y: number }>) {
  saveLayout(positions)
}

async function onReset() {
  await resetLayout()
  await fetchTopology()
  selectedNodeId.value = null
  highlightEdgeId.value = null
  nextTick(() => graphRef.value?.fitToContents())
}

// Fetch client-side only (v-network-graph is client-only)
onMounted(() => {
  if (!isAllContext.value) {
    fetchTopology()
  }
})

watch(siteId, (newId) => {
  if (newId && newId !== 'all') {
    selectedNodeId.value = null
    highlightEdgeId.value = null
    fetchTopology()
  }
})
</script>
