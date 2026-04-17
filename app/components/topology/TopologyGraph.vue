<template>
  <div class="relative h-full w-full">
    <!-- Toolbar -->
    <div class="absolute left-4 top-4 z-10 flex gap-1.5">
      <UButton size="xs" color="neutral" variant="subtle" @click="fitToContents">
        {{ $t('topology.fit') }}
      </UButton>
      <UButton size="xs" color="neutral" variant="subtle" @click="exportPng">
        {{ $t('topology.exportPng') }}
      </UButton>
      <UButton size="xs" color="neutral" variant="subtle" @click="$emit('reset')">
        {{ $t('topology.resetLayout') }}
      </UButton>
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
        <!-- Custom node rendering -->
        <template #override-node="{ nodeId, scale, config, ...slotProps }">
          <g :class="{ 'cursor-pointer': !isGhostNode(nodeId) }">
            <rect
              :x="-70 * scale"
              :y="-35 * scale"
              :width="140 * scale"
              :height="70 * scale"
              :rx="8 * scale"
              :fill="nodeBackground"
              :stroke="selectedNodeId === nodeId ? 'rgba(34,197,94,0.4)' : nodeBorder"
              :stroke-width="selectedNodeId === nodeId ? 2 : 1"
              :stroke-dasharray="isGhostNode(nodeId) ? '4,4' : 'none'"
            />

            <text
              :y="-10 * scale"
              :x="-55 * scale"
              :font-size="12 * scale"
              font-weight="600"
              fill="currentColor"
              class="text-gray-900 dark:text-white"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeData(nodeId)?.name || '', 14) }}
            </text>

            <g v-if="getNodeRole(nodeId)">
              <rect
                :x="20 * scale"
                :y="-20 * scale"
                :width="40 * scale"
                :height="16 * scale"
                :rx="4 * scale"
                :fill="roleBadgeBg(getNodeRole(nodeId)!)"
                :stroke="roleBadgeBorder(getNodeRole(nodeId)!)"
                stroke-width="0.5"
              />
              <text
                :x="40 * scale"
                :y="-10 * scale"
                :font-size="8 * scale"
                :fill="roleBadgeColor(getNodeRole(nodeId)!)"
                text-anchor="middle"
                dominant-baseline="middle"
                font-weight="500"
              >
                {{ roleShortLabel(getNodeRole(nodeId)!) }}
              </text>
            </g>

            <text
              v-if="getNodeModel(nodeId)"
              :y="2 * scale"
              :x="0"
              :font-size="9 * scale"
              fill="currentColor"
              class="text-gray-400"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              {{ truncateText(getNodeModel(nodeId)!, 22) }}
            </text>

            <template v-if="isGhostNode(nodeId)">
              <text
                :y="20 * scale"
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

            <template v-else>
              <line
                :x1="-55 * scale" :y1="14 * scale"
                :x2="55 * scale" :y2="14 * scale"
                :stroke="nodeBorder"
                stroke-width="0.5"
              />
              <g :transform="`translate(${-40 * scale}, ${26 * scale})`">
                <template v-if="getNodeData(nodeId)?.ports_up">
                  <circle :r="3 * scale" fill="#22c55e" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#22c55e" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_up }}
                  </text>
                </template>
              </g>
              <g :transform="`translate(${-10 * scale}, ${26 * scale})`">
                <template v-if="getNodeData(nodeId)?.ports_down">
                  <circle :r="3 * scale" fill="#9ca3af" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#9ca3af" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_down }}
                  </text>
                </template>
              </g>
              <g :transform="`translate(${20 * scale}, ${26 * scale})`">
                <template v-if="getNodeData(nodeId)?.ports_disabled">
                  <circle :r="3 * scale" fill="#ef4444" />
                  <text :x="6 * scale" :font-size="9 * scale" fill="#ef4444" font-family="ui-monospace,monospace" dominant-baseline="middle">
                    {{ (getNodeData(nodeId) as TopologyNode).ports_disabled }}
                  </text>
                </template>
              </g>
            </template>
          </g>
        </template>

        <template #edge-label="{ edge, ...slotProps }">
          <v-edge-label
            :text="getEdgeSourceLabel(edge)"
            align="source"
            :vertical-align="0"
            :font-size="9"
            font-family="ui-monospace,monospace"
            fill="#6b7280"
          />
          <v-edge-label
            :text="getEdgeTargetLabel(edge)"
            align="target"
            :vertical-align="0"
            :font-size="9"
            font-family="ui-monospace,monospace"
            fill="#6b7280"
          />
        </template>
      </v-network-graph>
    </ClientOnly>

    <!-- Legend -->
    <div class="absolute bottom-4 left-4 flex gap-2 rounded-md border border-default bg-elevated px-3 py-2">
      <span class="flex items-center gap-1.5 text-xs text-gray-400">
        <span class="inline-block h-2.5 w-2.5 rounded-sm border-2" style="border-color: #ef4444" /> Core
      </span>
      <span class="flex items-center gap-1.5 text-xs text-gray-400">
        <span class="inline-block h-2.5 w-2.5 rounded-sm border-2" style="border-color: #3b82f6" /> Dist
      </span>
      <span class="flex items-center gap-1.5 text-xs text-gray-400">
        <span class="inline-block h-2.5 w-2.5 rounded-sm border-2" style="border-color: #22c55e" /> Access
      </span>
      <span class="flex items-center gap-1.5 text-xs text-gray-400">
        <span class="inline-block h-2.5 w-2.5 rounded-sm border-2" style="border-color: #eab308" /> Mgmt
      </span>
    </div>

    <!-- Stats -->
    <div class="absolute bottom-4 right-4 rounded-md border border-default bg-elevated px-3 py-2 font-mono text-xs text-gray-500">
      {{ Object.keys(graphNodes).length }} switches · {{ Object.keys(graphEdges).length }} links
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
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
  'select-edge': [edgeId: string]
  'positions-changed': [positions: Record<string, { x: number; y: number }>]
  'reset': []
}>()

const graphRef = ref<any>(null)

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const nodeBackground = computed(() => isDark.value ? '#0e0e0e' : '#ffffff')
const nodeBorder = computed(() => isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')

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

function roleShortLabel(role: string): string {
  const map: Record<string, string> = {
    core: 'Core', distribution: 'Dist', access: 'Access', management: 'Mgmt'
  }
  return map[role] || role
}

function truncateText(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '\u2026' : text
}

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

function calculateAutoLayout(): Record<string, { x: number; y: number }> {
  const tiers: Record<number, string[]> = { 0: [], 1: [], 2: [] }

  for (const n of props.nodes) {
    if (n.role === 'core') tiers[0]!.push(n.id)
    else if (n.role === 'distribution') tiers[1]!.push(n.id)
    else tiers[2]!.push(n.id)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  const xSpacing = 200
  const ySpacing = 200

  for (const [tierStr, nodeIds] of Object.entries(tiers)) {
    const tier = Number(tierStr)
    const totalWidth = (nodeIds.length - 1) * xSpacing
    const startX = -totalWidth / 2

    for (let i = 0; i < nodeIds.length; i++) {
      positions[nodeIds[i]!] = {
        x: startX + i * xSpacing,
        y: tier * ySpacing
      }
    }
  }

  const ghostY = 3 * ySpacing
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

const graphConfigs = computed(() => defineConfigs({
  view: {
    panEnabled: true,
    zoomEnabled: true,
    scalingObjects: true,
    minZoomLevel: 0.2,
    maxZoomLevel: 3
  },
  node: {
    selectable: true,
    draggable: (nodeId: string) => !isGhostNode(nodeId),
    normal: {
      type: 'rect',
      width: 140,
      height: 70,
      borderRadius: 8,
      color: 'transparent'
    },
    hover: {
      color: 'transparent'
    },
    selected: {
      color: 'transparent'
    }
  },
  edge: {
    selectable: true,
    gap: 5,
    keepOrder: 'vertical',
    normal: {
      color: isDark.value ? '#2a2a2a' : '#d4d4d8',
      width: 2
    },
    hover: {
      color: isDark.value ? '#444' : '#a1a1aa',
      width: 3
    },
    selected: {
      color: 'rgba(34,197,94,0.5)',
      width: 3
    }
  }
}))

const eventHandlers = {
  'node:click': ({ node }: { node: string }) => {
    if (!isGhostNode(node)) {
      emit('select-node', node)
    }
  },
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

function fitToContents() {
  graphRef.value?.fitToContents()
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
