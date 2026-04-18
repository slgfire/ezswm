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
            <feFlood :flood-color="roleBadgeColor(r)" flood-opacity="0.15" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Custom node rendering -->
        <template #override-node="{ nodeId, scale, config, ...slotProps }">
          <g
            :class="{ 'cursor-pointer': !isGhostNode(nodeId) }"
            :filter="getNodeFilter(nodeId)"
            style="pointer-events: all"
            @click.stop="onNodeClick(nodeId)"
            @pointerenter="hoveredNodeId = nodeId"
            @pointerleave="hoveredNodeId = null"
          >
            <!-- Node card background -->
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
            <!-- Role accent bar (left edge) -->
            <rect
              v-if="getNodeRole(nodeId) && !isGhostNode(nodeId)"
              :x="-getNodeSize(nodeId).w / 2 * scale"
              :y="(-getNodeSize(nodeId).h / 2 + 8) * scale"
              :width="(getNodeRole(nodeId) === 'core' ? 4 : 3) * scale"
              :height="(getNodeSize(nodeId).h - 16) * scale"
              :rx="1.5 * scale"
              :fill="roleBadgeColor(getNodeRole(nodeId)!)"
              :opacity="getNodeRole(nodeId) === 'core' ? 0.8 : getNodeRole(nodeId) === 'distribution' ? 0.5 : 0.35"
            />

            <!-- Name (left-aligned) -->
            <text
              :y="(-getNodeSize(nodeId).h / 2 + 19) * scale"
              :x="(-getNodeSize(nodeId).w / 2 + 12) * scale"
              :font-size="(getNodeRole(nodeId) === 'core' ? 13 : 12) * scale"
              font-weight="600"
              fill="currentColor"
              class="text-gray-900 dark:text-white"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeData(nodeId)?.name || '', getNodeRole(nodeId) === 'core' ? 20 : getNodeRole(nodeId) === 'distribution' ? 17 : 16) }}
            </text>

            <!-- Role badge (top-right) -->
            <g v-if="getNodeRole(nodeId)">
              <rect
                :x="(getNodeSize(nodeId).w / 2 - 48) * scale"
                :y="(-getNodeSize(nodeId).h / 2 + 9) * scale"
                :width="40 * scale"
                :height="16 * scale"
                :rx="4 * scale"
                :fill="roleBadgeBg(getNodeRole(nodeId)!)"
                :stroke="roleBadgeBorder(getNodeRole(nodeId)!)"
                stroke-width="0.5"
              />
              <text
                :x="(getNodeSize(nodeId).w / 2 - 28) * scale"
                :y="(-getNodeSize(nodeId).h / 2 + 19) * scale"
                :font-size="8 * scale"
                :fill="roleBadgeColor(getNodeRole(nodeId)!)"
                text-anchor="middle"
                dominant-baseline="middle"
                font-weight="500"
              >
                {{ roleShortLabel(getNodeRole(nodeId)!) }}
              </text>
            </g>

            <!-- Model subtitle (left-aligned like name) -->
            <text
              v-if="getNodeModel(nodeId)"
              :y="(-getNodeSize(nodeId).h / 2 + 35) * scale"
              :x="(-getNodeSize(nodeId).w / 2 + 12) * scale"
              :font-size="9 * scale"
              fill="currentColor"
              class="text-gray-500"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeModel(nodeId)!, getNodeRole(nodeId) === 'core' ? 30 : 24) }}
            </text>

            <!-- Ghost node: site name -->
            <template v-if="isGhostNode(nodeId)">
              <text
                :y="(getNodeSize(nodeId).h / 2 - 14) * scale"
                :x="0"
                :font-size="9 * scale"
                fill="currentColor"
                class="text-gray-500"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ getGhostSiteName(nodeId) }}
              </text>
            </template>

            <!-- Port status bar -->
            <template v-else>
              <line
                :x1="(-getNodeSize(nodeId).w / 2 + 10) * scale"
                :y1="(getNodeSize(nodeId).h / 2 - 24) * scale"
                :x2="(getNodeSize(nodeId).w / 2 - 10) * scale"
                :y2="(getNodeSize(nodeId).h / 2 - 24) * scale"
                :stroke="nodeBorder"
                stroke-width="0.5"
              />
              <!-- Port count label -->
              <text
                :x="(-getNodeSize(nodeId).w / 2 + 12) * scale"
                :y="(getNodeSize(nodeId).h / 2 - 10) * scale"
                :font-size="9 * scale"
                fill="currentColor"
                class="text-gray-500"
                font-family="ui-monospace,monospace"
                dominant-baseline="middle"
              >
                {{ getPortCount(nodeId) }}p
              </text>
              <!-- Up -->
              <g :transform="`translate(${(-getNodeSize(nodeId).w / 2 + 44) * scale}, ${(getNodeSize(nodeId).h / 2 - 10) * scale})`">
                <template v-if="(getNodeData(nodeId) as TopologyNode)?.ports_up">
                  <polygon :points="portTriangleUp(scale)" fill="#22c55e" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#22c55e" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_up }}
                  </text>
                </template>
              </g>
              <!-- Down -->
              <g :transform="`translate(${6 * scale}, ${(getNodeSize(nodeId).h / 2 - 10) * scale})`">
                <template v-if="(getNodeData(nodeId) as TopologyNode)?.ports_down">
                  <line :x1="-3 * scale" :y1="0" :x2="3 * scale" :y2="0" stroke="#6b7280" :stroke-width="2 * scale" stroke-linecap="round" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#6b7280" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_down }}
                  </text>
                </template>
              </g>
              <!-- Disabled -->
              <g :transform="`translate(${(getNodeSize(nodeId).w / 2 - 36) * scale}, ${(getNodeSize(nodeId).h / 2 - 10) * scale})`">
                <template v-if="(getNodeData(nodeId) as TopologyNode)?.ports_disabled">
                  <polygon :points="portTriangleDown(scale)" fill="#ef4444" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#ef4444" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_disabled }}
                  </text>
                </template>
              </g>
            </template>
          </g>
        </template>

        <!-- Edge labels -->
        <template #edge-label="{ edge, ...slotProps }">
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

    <!-- Bottom bar: Legend + Stats unified -->
    <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
      <div class="pointer-events-auto flex items-center gap-3 rounded-lg border border-default bg-elevated/90 px-3 py-1.5 shadow-md backdrop-blur-sm">
        <span class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full" style="background: #ef4444" /> Core
        </span>
        <span class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full" style="background: #3b82f6" /> Dist
        </span>
        <span class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full" style="background: #22c55e" /> Access
        </span>
        <span class="flex items-center gap-1.5 text-xs text-gray-400">
          <span class="inline-block h-2 w-2 rounded-full" style="background: #eab308" /> Mgmt
        </span>
        <div class="h-3 w-px bg-default" />
        <span class="font-mono text-xs text-gray-500">
          {{ Object.keys(graphNodes).length }} switches · {{ Object.keys(graphEdges).length }} links
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineConfigs } from 'v-network-graph'
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

const graphRef = ref<any>(null)
const hoveredNodeId = ref<string | null>(null)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const nodeBackground = computed(() => isDark.value ? '#0e0e0e' : '#ffffff')
const nodeBorder = computed(() => isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')

// --- Role color helpers ---

function roleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    core: '#ef4444', distribution: '#3b82f6', access: '#22c55e', management: '#eab308'
  }
  return map[role] || '#64748b'
}

function roleBadgeBg(role: string): string {
  const map: Record<string, string> = {
    core: 'rgba(239,68,68,0.1)', distribution: 'rgba(59,130,246,0.1)',
    access: 'rgba(34,197,94,0.1)', management: 'rgba(234,179,8,0.1)'
  }
  return map[role] || 'rgba(100,116,139,0.1)'
}

function roleBadgeBorder(role: string): string {
  const map: Record<string, string> = {
    core: 'rgba(239,68,68,0.2)', distribution: 'rgba(59,130,246,0.2)',
    access: 'rgba(34,197,94,0.2)', management: 'rgba(234,179,8,0.2)'
  }
  return map[role] || 'rgba(100,116,139,0.2)'
}

function roleNodeBorder(role: string | undefined, hovered: boolean): string {
  if (!role) return nodeBorder.value
  const base: Record<string, [number, number]> = {
    core: [0.3, 0.45],
    distribution: [0.25, 0.4],
    access: [0.15, 0.28],
    management: [0.15, 0.28]
  }
  const [normal, hover] = base[role] || [0.08, 0.15]
  const opacity = hovered ? hover : normal
  const color = roleBadgeColor(role)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

function roleShortLabel(role: string): string {
  const map: Record<string, string> = {
    core: 'Core', distribution: 'Dist', access: 'Access', management: 'Mgmt'
  }
  return map[role] || role
}

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

// Subtle background tint per role
function nodeBackgroundForRole(nodeId: string): string {
  if (isGhostNode(nodeId)) return nodeBackground.value
  const role = getNodeRole(nodeId)
  if (!role || !isDark.value) return nodeBackground.value
  const tints: Record<string, string> = {
    core: 'rgba(239,68,68,0.03)',
    distribution: 'rgba(59,130,246,0.02)',
    access: 'rgba(34,197,94,0.015)',
    management: 'rgba(234,179,8,0.02)'
  }
  return tints[role] || nodeBackground.value
}

function getNodeStroke(nodeId: string): string {
  const role = getNodeRole(nodeId)
  const hovered = hoveredNodeId.value === nodeId
  return roleNodeBorder(role, hovered)
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

function portTriangleUp(scale: number): string {
  const s = 3.5 * scale
  return `0,${-s} ${s},${s} ${-s},${s}`
}

function portTriangleDown(scale: number): string {
  const s = 3.5 * scale
  return `0,${s} ${s},${-s} ${-s},${-s}`
}

function getPortCount(nodeId: string): number {
  const n = nodeMap.value.get(nodeId)
  if (!n) return 0
  return (n as TopologyNode).port_count || 0
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
  const result: Record<string, { source: string; target: string }> = {}
  for (const link of props.links) {
    result[link.id] = {
      source: link.source_switch_id,
      target: link.target_switch_id
    }
  }
  return result
})

// --- Auto-layout ---

function calculateAutoLayout(): Record<string, { x: number; y: number }> {
  const tiers: Record<number, string[]> = { 0: [], 1: [], 2: [] }

  for (const n of props.nodes) {
    if (n.role === 'core') tiers[0]!.push(n.id)
    else if (n.role === 'distribution') tiers[1]!.push(n.id)
    else tiers[2]!.push(n.id)
  }

  // Skip empty tiers
  const activeTiers: string[][] = []
  for (const t of [tiers[0]!, tiers[1]!, tiers[2]!]) {
    if (t.length > 0) activeTiers.push(t)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const xSpacing = 210
  const ySpacing = 220

  for (let tierIdx = 0; tierIdx < activeTiers.length; tierIdx++) {
    const nodeIds = activeTiers[tierIdx]!
    const totalWidth = (nodeIds.length - 1) * xSpacing
    const startX = -totalWidth / 2

    for (let i = 0; i < nodeIds.length; i++) {
      positions[nodeIds[i]!] = {
        x: startX + i * xSpacing,
        y: tierIdx * ySpacing
      }
    }
  }

  const lastTierY = (activeTiers.length - 1) * ySpacing
  const ghostY = lastTierY + ySpacing
  let ghostX = -(props.ghostNodes.length - 1) * xSpacing / 2
  for (const g of props.ghostNodes) {
    if (!positions[g.id]) {
      positions[g.id] = { x: ghostX, y: ghostY }
      ghostX += xSpacing
    }
  }

  return positions
}

const graphLayouts = computed(() => {
  const saved = props.savedPositions
  const auto = calculateAutoLayout()
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

const graphConfigs = computed(() => defineConfigs({
  view: {
    panEnabled: true,
    zoomEnabled: true,
    scalingObjects: true,
    minZoomLevel: 0.2,
    maxZoomLevel: 3,
    autoPanAndZoomOnLoad: 'fit-content',
    fitContentMargin: { top: 30, bottom: 50, left: 50, right: 50 }
  },
  node: {
    selectable: true,
    draggable: (nodeId: string) => !isGhostNode(nodeId),
    label: {
      visible: false
    },
    focusring: {
      visible: false
    },
    normal: {
      type: 'rect',
      width: 196,
      height: 86,
      borderRadius: 8,
      color: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0
    },
    hover: {
      color: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0
    },
    selected: {
      color: 'transparent',
      strokeColor: isDark.value ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.5)',
      strokeWidth: 1.5
    }
  },
  edge: {
    selectable: true,
    gap: 14,
    keepOrder: 'vertical',
    normal: {
      color: isDark.value ? '#555' : '#bbb',
      width: 2
    },
    hover: {
      color: isDark.value ? '#999' : '#888',
      width: 3
    },
    selected: {
      color: 'rgba(34,197,94,0.6)',
      width: 3.5
    },
    margin: null
  }
}))

// --- Event handlers ---

// Node click from SVG template (override-node has pointer-events: all)
function onNodeClick(nodeId: string) {
  if (!isGhostNode(nodeId)) {
    emit('select-node', nodeId)
  }
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
    if (graphRef.value) {
      const positions: Record<string, { x: number; y: number }> = {}
      const layouts = graphRef.value.layouts
      if (layouts?.nodes) {
        for (const [id, pos] of Object.entries(layouts.nodes)) {
          if (!isGhostNode(id)) {
            positions[id] = pos as { x: number; y: number }
          }
        }
      }
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
  try {
    const svgText = await graphRef.value.exportAsSvgText({ embedImages: true })
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth * 2
      canvas.height = img.naturalHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `topology-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    }
    img.src = url
  } catch {
    // Export failed silently
  }
}

defineExpose({ fitToContents })
</script>
