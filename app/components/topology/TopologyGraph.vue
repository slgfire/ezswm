<template>
  <div class="relative h-full w-full">
    <!-- Floating Toolbar -->
    <div class="absolute left-3 top-3 z-10 flex items-center gap-px rounded-lg border border-default bg-elevated/90 p-1 shadow-md backdrop-blur-sm">
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-plus" :title="$t('topology.zoomIn')" @click="zoomIn" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-minus" :title="$t('topology.zoomOut')" @click="zoomOut" />
      <div class="mx-0.5 h-4 w-px bg-default" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-arrows-pointing-out" :title="$t('topology.fit')" @click="fitToContents" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-arrow-path" :title="$t('topology.resetLayout')" @click="$emit('reset')" />
      <div class="mx-0.5 h-4 w-px bg-default" />
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-arrow-down-tray" :title="$t('topology.exportPng')" @click="exportPng" />
    </div>

    <!-- Graph -->
    <ClientOnly>
      <v-network-graph
        ref="graphRef"
        :nodes="graphNodes"
        :edges="graphEdges"
        :configs="graphConfigs"
        :layouts="graphLayouts"
        :event-handlers="eventHandlers"
        class="h-full w-full"
      >
        <!-- SVG defs for glow filters -->
        <defs>
          <!-- Hover glow per role -->
          <filter v-for="r in ['core', 'distribution', 'access', 'management']" :id="`glow-${r}`" :key="r" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood :flood-color="topologyRoleBadgeColor(r)" flood-opacity="0.15" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Custom node rendering (matches switch card design from switches/index) -->
        <template #override-node="{ nodeId, scale }">
          <!-- Interaction layer: drag + click + hover -->
          <rect
            class="draggable selectable"
            :x="-getNodeSize(nodeId).w / 2 * scale"
            :y="-getNodeSize(nodeId).h / 2 * scale"
            :width="getNodeSize(nodeId).w * scale"
            :height="getNodeSize(nodeId).h * scale"
            fill="transparent"
            stroke="none"
            style="pointer-events: all; cursor: grab"
            @click="onNodeClick(nodeId)"
            @pointerenter="hoveredNodeId = nodeId"
            @pointerleave="hoveredNodeId = null"
          />
          <g
            :filter="getNodeFilter(nodeId)"
            style="pointer-events: none"
          >
            <!-- Card background -->
            <rect
              :x="-getNodeSize(nodeId).w / 2 * scale"
              :y="-getNodeSize(nodeId).h / 2 * scale"
              :width="getNodeSize(nodeId).w * scale"
              :height="getNodeSize(nodeId).h * scale"
              :rx="8 * scale"
              :fill="nodeBackgroundForRole(nodeId)"
              :stroke="getNodeStroke(nodeId)"
              :stroke-width="selectedNodeId === nodeId ? 2 : hoveredNodeId === nodeId ? 1.5 : 1"
              :stroke-dasharray="isGhostNode(nodeId) ? '4,4' : 'none'"
            />

            <!-- Header: Name + Role badge (like switch cards) -->
            <text
              :y="(-getNodeSize(nodeId).h / 2 + 18) * scale"
              :x="(-getNodeSize(nodeId).w / 2 + 14) * scale"
              :font-size="12 * scale"
              font-weight="600"
              :fill="isDark ? '#fff' : '#111'"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeData(nodeId)?.name || '', getNodeRole(nodeId) ? getNameMaxChars(nodeId) : getNameMaxChars(nodeId) + 5) }}
            </text>

            <g v-if="getNodeRole(nodeId)">
              <rect
                :x="(getNodeSize(nodeId).w / 2 - 46) * scale"
                :y="(-getNodeSize(nodeId).h / 2 + 10) * scale"
                :width="38 * scale"
                :height="16 * scale"
                :rx="4 * scale"
                :fill="topologyRoleBadgeBg(getNodeRole(nodeId)!)"
                :stroke="topologyRoleBadgeBorder(getNodeRole(nodeId)!)"
                stroke-width="0.5"
              />
              <text
                :x="(getNodeSize(nodeId).w / 2 - 27) * scale"
                :y="(-getNodeSize(nodeId).h / 2 + 18) * scale"
                :font-size="8 * scale"
                :fill="topologyRoleBadgeColor(getNodeRole(nodeId)!)"
                text-anchor="middle"
                dominant-baseline="central"
                font-weight="500"
              >
                {{ topologyRoleShortLabel(getNodeRole(nodeId)!) }}
              </text>
            </g>

            <!-- Subtitle: Manufacturer · Model (like switch cards) -->
            <text
              v-if="getNodeModel(nodeId)"
              :y="(-getNodeSize(nodeId).h / 2 + 34) * scale"
              :x="(-getNodeSize(nodeId).w / 2 + 14) * scale"
              :font-size="9 * scale"
              :fill="isDark ? '#9ca3af' : '#6b7280'"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeModel(nodeId)!, Math.floor(getNodeSize(nodeId).w / 7)) }}
            </text>

            <!-- Ghost node: site name -->
            <template v-if="isGhostNode(nodeId)">
              <text
                :y="(getNodeSize(nodeId).h / 2 - 14) * scale"
                :x="0"
                :font-size="9 * scale"
                :fill="isDark ? '#6b7280' : '#6b7280'"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ getGhostSiteName(nodeId) }}
              </text>
            </template>

            <!-- Port footer (same as switch cards: "XX ports" left, colored dots right) -->
            <template v-else>
              <!-- border-t separator -->
              <line
                :x1="(-getNodeSize(nodeId).w / 2) * scale"
                :y1="(getNodeSize(nodeId).h / 2 - 22) * scale"
                :x2="(getNodeSize(nodeId).w / 2) * scale"
                :y2="(getNodeSize(nodeId).h / 2 - 22) * scale"
                stroke="#222"
                stroke-width="1"
              />
              <!-- "XX ports" label -->
              <text
                :x="(-getNodeSize(nodeId).w / 2 + 14) * scale"
                :y="(getNodeSize(nodeId).h / 2 - 9) * scale"
                :font-size="8 * scale"
                fill="#9ca3af"
                font-family="ui-monospace,monospace"
                dominant-baseline="middle"
                font-weight="500"
                letter-spacing="0.05em"
              >
                {{ getPortCount(nodeId) }} PORTS
              </text>
              <!-- Colored dots + counts (right-aligned, same as switch cards) -->
              <g :transform="`translate(${(getNodeSize(nodeId).w / 2 - 14) * scale}, ${(getNodeSize(nodeId).h / 2 - 9) * scale})`">
                <!-- Disabled (rightmost) -->
                <g v-if="(getNodeData(nodeId) as TopologyNode)?.ports_disabled" :transform="`translate(0, 0)`">
                  <circle :r="3 * scale" fill="#ef4444" :cx="-3 * scale" />
                  <text :x="-10 * scale" :font-size="8.5 * scale" fill="#ef4444" font-family="ui-monospace,monospace" dominant-baseline="central" text-anchor="end">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_disabled }}
                  </text>
                </g>
                <!-- Down -->
                <g v-if="(getNodeData(nodeId) as TopologyNode)?.ports_down" :transform="`translate(${(getNodeData(nodeId) as TopologyNode)?.ports_disabled ? -32 * scale : 0}, 0)`">
                  <circle :r="3 * scale" fill="#9ca3af" :cx="-3 * scale" />
                  <text :x="-10 * scale" :font-size="8.5 * scale" fill="#9ca3af" font-family="ui-monospace,monospace" dominant-baseline="central" text-anchor="end">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_down }}
                  </text>
                </g>
                <!-- Up -->
                <g v-if="(getNodeData(nodeId) as TopologyNode)?.ports_up" :transform="`translate(${getPortDotsOffset(nodeId, scale)}, 0)`">
                  <circle :r="3 * scale" fill="#22c55e" :cx="-3 * scale" />
                  <text :x="-10 * scale" :font-size="8.5 * scale" fill="#22c55e" font-family="ui-monospace,monospace" dominant-baseline="central" text-anchor="end">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_up }}
                  </text>
                </g>
              </g>
            </template>
          </g>
        </template>

        <!-- Edge labels -->
        <template #edge-label="{ edge }">
          <v-edge-label
            v-if="getEdgeSourceLabel(edge)"
            :text="getEdgeSourceLabel(edge)"
            align="source"
            :vertical-align="0"
            :font-size="9"
            font-family="ui-monospace,monospace"
            :fill="isDark ? '#888' : '#666'"
          />
          <v-edge-label
            v-if="getEdgeTargetLabel(edge)"
            :text="getEdgeTargetLabel(edge)"
            align="target"
            :vertical-align="0"
            :font-size="9"
            font-family="ui-monospace,monospace"
            :fill="isDark ? '#888' : '#666'"
          />
        </template>
      </v-network-graph>
    </ClientOnly>

    <!-- Bottom bar: Legend (matching app chip style) -->
    <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pointer-events-none text-[11px] text-gray-500 dark:text-gray-400">
      <!-- Role chips -->
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block h-2 w-2 rounded-full" style="background: #ef4444" />
        <span class="font-medium text-gray-700 dark:text-gray-200">Core</span>
      </div>
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block h-2 w-2 rounded-full" style="background: #3b82f6" />
        <span class="font-medium text-gray-700 dark:text-gray-200">Dist</span>
      </div>
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block h-2 w-2 rounded-full" style="background: #22c55e" />
        <span class="font-medium text-gray-700 dark:text-gray-200">Access</span>
      </div>
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block h-2 w-2 rounded-full" style="background: #eab308" />
        <span class="font-medium text-gray-700 dark:text-gray-200">Mgmt</span>
      </div>
      <span class="text-gray-600 dark:text-gray-500">|</span>
      <!-- Edge type chips -->
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block w-3 border-t border-gray-500" />
        <span>Link</span>
      </div>
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block w-3 border-t border-dashed border-gray-400" />
        <span>Trunk</span>
      </div>
      <div class="pointer-events-auto inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 leading-none dark:bg-neutral-800">
        <span class="inline-block w-3 border-t-2 border-[#7a8999]" />
        <span>LAG</span>
      </div>
      <span class="text-gray-600 dark:text-gray-500">|</span>
      <!-- Stats -->
      <span class="font-mono text-gray-500">
        {{ Object.keys(graphNodes).length }} switches · {{ Object.keys(graphEdges).length }} links
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TopologyNode, TopologyLink, TopologyGhostNode } from '~~/types/topology'

const props = defineProps<{
  nodes: TopologyNode[]
  links: TopologyLink[]
  ghostNodes: TopologyGhostNode[]
  savedPositions: Record<string, { x: number; y: number }> | null
  selectedNodeId: string | null
  highlightEdgeId?: string | null
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
  'select-edge': [edgeId: string]
  'positions-changed': [positions: Record<string, { x: number; y: number }>]
  'reset': []
}>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphRef = ref<any>(null)
const hoveredNodeId = ref<string | null>(null)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const nodeBackground = computed(() => isDark.value ? '#0e0e0e' : '#ffffff')
const nodeBorder = computed(() => isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '\u2026' : text
}

// --- Node sizing by role ---

function getNodeSize(nodeId: string): { w: number; h: number } {
  const role = getNodeRole(nodeId)
  if (isGhostNode(nodeId)) return { w: 140, h: 58 }
  if (role === 'core') return { w: 196, h: 86 }
  if (role === 'distribution') return { w: 176, h: 78 }
  return { w: 164, h: 72 }
}

// Subtle background tint per role (opaque to fully occlude edges behind cards)
function nodeBackgroundForRole(nodeId: string): string {
  if (isGhostNode(nodeId)) return nodeBackground.value
  const role = getNodeRole(nodeId)
  if (!role || !isDark.value) return nodeBackground.value
  const tints: Record<string, string> = {
    core: '#100e0e',
    distribution: '#0e0e10',
    access: '#0e0f0e',
    management: '#0f0e0e'
  }
  return tints[role] || nodeBackground.value
}

function getNodeStroke(nodeId: string): string {
  const role = getNodeRole(nodeId)
  const hovered = hoveredNodeId.value === nodeId
  return topologyRoleNodeBorder(role, hovered, nodeBorder.value)
}

function getNodeFilter(nodeId: string): string | undefined {
  if (isGhostNode(nodeId)) return undefined
  if (hoveredNodeId.value === nodeId && getNodeRole(nodeId)) {
    return `url(#glow-${getNodeRole(nodeId)})`
  }
  return undefined
}

const selectedNodeId = computed(() => props.selectedNodeId)

// --- Port helpers ---

function getPortCount(nodeId: string): number {
  const n = nodeMap.value.get(nodeId)
  if (!n) return 0
  return (n as TopologyNode).port_count || 0
}

function getNameMaxChars(nodeId: string): number {
  const w = getNodeSize(nodeId).w
  // Approximate: ~7px per char at 12px font, minus badge space (~50px)
  return Math.floor((w - 60) / 7)
}

function getPortDotsOffset(nodeId: string, scale: number): number {
  const n = nodeMap.value.get(nodeId) as TopologyNode | undefined
  if (!n) return 0
  let offset = 0
  if (n.ports_disabled) offset -= 32 * scale
  if (n.ports_down) offset -= 32 * scale
  return offset
}

// --- Node data helpers ---

const nodeMap = computed(() => {
  const map = new Map<string, TopologyNode>()
  for (const n of props.nodes) map.set(n.id, n)
  return map
})

const ghostMap = computed(() => {
  const map = new Map<string, TopologyGhostNode>()
  for (const g of props.ghostNodes) map.set(g.id, g)
  return map
})

function getNodeData(nodeId: string): TopologyNode | TopologyGhostNode | undefined {
  return nodeMap.value.get(nodeId) || ghostMap.value.get(nodeId)
}

function getNodeRole(nodeId: string): string | undefined {
  return nodeMap.value.get(nodeId)?.role
}

function getNodeModel(nodeId: string): string | undefined {
  const n = nodeMap.value.get(nodeId)
  if (!n) return undefined
  return [n.manufacturer, n.model].filter(Boolean).join(' · ') || undefined
}

function isGhostNode(nodeId: string): boolean {
  return ghostMap.value.has(nodeId) && !nodeMap.value.has(nodeId)
}

function getGhostSiteName(nodeId: string): string {
  return ghostMap.value.get(nodeId)?.site_name || ''
}

// --- Edge data ---

const edgeMap = computed(() => {
  const map = new Map<string, TopologyLink>()
  for (const l of props.links) map.set(l.id, l)
  return map
})

function getEdgeSourceLabel(edgeId: string): string {
  return edgeMap.value.get(edgeId)?.source_port_label || ''
}

function getEdgeTargetLabel(edgeId: string): string {
  return edgeMap.value.get(edgeId)?.target_port_label || ''
}

// --- v-network-graph data ---

const graphNodes = computed(() => {
  const result: Record<string, { name: string }> = {}
  for (const n of props.nodes) {
    result[n.id] = { name: n.name }
  }
  for (const g of props.ghostNodes) {
    if (!result[g.id]) {
      result[g.id] = { name: g.name }
    }
  }
  return result
})

const graphEdges = computed(() => {
  const result: Record<string, { source: string; target: string; isLag: boolean; isTrunk: boolean }> = {}
  for (const link of props.links) {
    result[link.id] = {
      source: link.source_switch_id,
      target: link.target_switch_id,
      isLag: !!link.lag_group_id,
      isTrunk: link.vlans.length > 1
    }
  }
  return result
})

const graphLayouts = computed(() => {
  const saved = props.savedPositions
  const auto = calculateTopologyLayout(props.nodes, props.ghostNodes)
  const merged: Record<string, { x: number; y: number }> = {}

  for (const [id, pos] of Object.entries(auto)) {
    merged[id] = pos
  }

  if (saved) {
    for (const [id, pos] of Object.entries(saved)) {
      if (id in merged) {
        merged[id] = pos
      }
    }
  }

  return { nodes: merged }
})

// --- Configs ---

const { graphConfigs } = useTopologyGraphConfig(isDark)

// --- Event handlers ---

// Track drag state to prevent click after drag
const isDragging = ref(false)

// Node click from SVG template — ignore if we just finished a drag
function onNodeClick(nodeId: string) {
  if (isDragging.value) {
    isDragging.value = false
    return
  }
  if (!isGhostNode(nodeId)) {
    emit('select-node', nodeId)
  }
}

// Read node positions from SVG transform attributes
function readNodePositionsFromSvg(): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}
  const container = graphRef.value?.$el as HTMLElement | undefined
  if (!container) return positions

  const nodeElements = container.querySelectorAll('.v-ng-node')
  // Build a map from node name to node ID for reverse lookup
  const nameToId = new Map<string, string>()
  for (const [id, node] of Object.entries(graphNodes.value)) {
    nameToId.set(node.name, id)
  }

  nodeElements.forEach((el: Element) => {
    const nameText = el.querySelector('text')?.textContent?.trim()
    if (!nameText) return
    // Match truncated names (ending with …)
    let nodeId: string | undefined
    if (nameText.endsWith('\u2026')) {
      // Truncated — find by prefix match
      const prefix = nameText.slice(0, -1)
      for (const [name, id] of nameToId) {
        if (name.startsWith(prefix)) { nodeId = id; break }
      }
    } else {
      nodeId = nameToId.get(nameText)
    }
    if (!nodeId) return

    const transform = el.getAttribute('transform') || ''
    const match = transform.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
    if (match) {
      positions[nodeId] = { x: parseFloat(match[1]!), y: parseFloat(match[2]!) }
    }
  })

  return positions
}

const eventHandlers = {
  'edge:click': ({ edge }: { edge: string }) => {
    const link = edgeMap.value.get(edge)
    if (link) {
      emit('select-edge', edge)
      emit('select-node', link.source_switch_id)
    }
  },
  'view:click': () => {
    emit('select-node', '')
  },
  'node:dragend': () => {
    isDragging.value = true
    // Read positions from SVG transforms (graphRef.layouts returns the
    // prop object, not the internal state after drag)
    const positions = readNodePositionsFromSvg()
    if (Object.keys(positions).length > 0) {
      emit('positions-changed', positions)
    }
  }
}

// --- Public methods ---

function fitToContents() {
  graphRef.value?.fitToContents()
}

function zoomIn() {
  graphRef.value?.zoomIn()
}

function zoomOut() {
  graphRef.value?.zoomOut()
}

async function exportPng() {
  if (!graphRef.value) return
  await exportGraphPng((opts) => graphRef.value.exportAsSvgText(opts))
}

defineExpose({ fitToContents, exportPng })
</script>
