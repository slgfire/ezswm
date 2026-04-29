<template>
  <USlideover
    v-model:open="isOpen"
    :title="node?.name || ''"
    :description="panelDescription"
  >
    <template #body>
      <div v-if="node" class="space-y-3">
        <!-- Metadata -->
        <div class="space-y-1 text-sm">
          <div v-if="node.location" class="flex items-center gap-2">
            <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
            <span class="text-gray-500 dark:text-gray-400">{{ node.location }}</span>
          </div>
          <SharedCopyButton v-if="node.management_ip" :value="node.management_ip"><span class="flex items-center gap-2">
            <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
            <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ node.management_ip }}</span>
          </span></SharedCopyButton>
        </div>

        <!-- Port stats -->
        <div class="flex items-center justify-between border-t border-b border-default py-1.5 font-mono">
          <span class="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {{ node.port_count }} {{ $t('topology.ports') }}
          </span>
          <div class="flex items-center gap-3 text-xs">
            <span v-if="node.ports_up" class="flex items-center gap-1 text-green-500">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              {{ node.ports_up }}
            </span>
            <span v-if="node.ports_down" class="flex items-center gap-1 text-gray-400">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
              {{ node.ports_down }}
            </span>
            <span v-if="node.ports_disabled" class="flex items-center gap-1 text-red-500">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {{ node.ports_disabled }}
            </span>
          </div>
        </div>

        <!-- Connections grouped by target switch -->
        <div v-if="switchGroups.length">
          <div class="text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
            {{ $t('topology.connections') }} ({{ nodeLinks.length }})
          </div>
          <div class="space-y-1.5">
            <div
              v-for="sw in switchGroups"
              :key="sw.targetId"
              class="rounded-lg border border-default bg-elevated/50"
              :class="sw.isGhost ? 'opacity-60' : 'cursor-pointer'"
              @click="!sw.isGhost && $emit('select-node', sw.targetId)"
            >
              <!-- Target switch header -->
              <div class="flex items-center justify-between px-3 py-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ sw.targetName }}
                </span>
                <UBadge
                  v-if="sw.isGhost"
                  color="neutral" variant="subtle" size="xs"
                >{{ $t('topology.crossSite') }}</UBadge>
                <UBadge
                  v-else-if="sw.targetRole"
                  :color="roleColor(sw.targetRole)" variant="subtle" size="xs"
                >{{ sw.targetRole }}</UBadge>
              </div>

              <!-- Port mappings -->
              <div class="border-t border-default px-3 py-1.5 space-y-0.5">
                <template v-for="lag in sw.lagGroups" :key="lag.key">
                  <div v-if="lag.lagName" class="text-[10px] text-gray-500 font-medium pt-0.5">
                    LAG: {{ lag.lagName }}
                  </div>
                  <div
                    v-for="link in lag.links"
                    :key="link.id"
                    class="flex items-center gap-2 py-0.5 font-mono text-xs text-gray-400"
                  >
                    <span class="text-gray-300 dark:text-gray-300">{{ getLocalPort(link) }}</span>
                    <span class="text-gray-600">↔</span>
                    <span class="text-gray-500">{{ getRemotePort(link) }}</span>
                  </div>
                </template>
              </div>

              <!-- VLANs (deduplicated per target switch) -->
              <div v-if="sw.vlans.length" class="border-t border-default px-3 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="vlan in sw.vlans"
                    :key="vlan"
                    class="rounded bg-neutral-800 px-1.5 py-0 text-[10px] text-gray-400"
                  >
                    {{ vlan }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        v-if="node"
        :to="`/sites/${siteId}/switches/${node.id}`"
        color="primary"
        variant="subtle"
        block
        icon="i-heroicons-arrow-top-right-on-square"
      >
        {{ $t('topology.openSwitch') }}
      </UButton>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { TopologyNode, TopologyLink, TopologyGhostNode } from '~~/types/topology'

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

const props = defineProps<{
  node: TopologyNode | null
  links: TopologyLink[]
  nodes: TopologyNode[]
  ghostNodes: TopologyGhostNode[]
  siteId: string
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
  'close': []
}>()

const isOpen = computed({
  get: () => !!props.node,
  set: (val: boolean) => {
    if (!val) emit('close')
  }
})

// Build description: "Role · Manufacturer · Model"
const panelDescription = computed(() => {
  if (!props.node) return ''
  const parts: string[] = []
  if (props.node.role) parts.push(props.node.role.charAt(0).toUpperCase() + props.node.role.slice(1))
  if (props.node.manufacturer) parts.push(props.node.manufacturer)
  if (props.node.model) parts.push(props.node.model)
  return parts.join(' · ')
})

function roleColor(role: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    core: 'error',
    distribution: 'info',
    access: 'success',
    management: 'warning'
  }
  return map[role] || 'neutral'
}

const nodeLinks = computed(() => {
  if (!props.node) return []
  return props.links.filter(
    l => l.source_switch_id === props.node!.id || l.target_switch_id === props.node!.id
  )
})

// Get local/remote port labels relative to the selected node
function getLocalPort(link: TopologyLink): string {
  return link.source_switch_id === props.node!.id
    ? link.source_port_label
    : link.target_port_label
}

function getRemotePort(link: TopologyLink): string {
  return link.source_switch_id === props.node!.id
    ? link.target_port_label
    : link.source_port_label
}

// Group by target switch, then by LAG within each switch
interface LagSubGroup {
  key: string
  lagName?: string
  links: TopologyLink[]
}

interface SwitchGroup {
  targetId: string
  targetName: string
  targetRole?: string
  isGhost: boolean
  lagGroups: LagSubGroup[]
  vlans: number[]
}

const switchGroups = computed((): SwitchGroup[] => {
  if (!props.node) return []

  const bySwitch = new Map<string, {
    targetId: string
    targetName: string
    targetRole?: string
    isGhost: boolean
    links: TopologyLink[]
  }>()

  for (const link of nodeLinks.value) {
    const targetId = link.source_switch_id === props.node!.id
      ? link.target_switch_id
      : link.source_switch_id

    const existing = bySwitch.get(targetId)
    if (existing) {
      existing.links.push(link)
    } else {
      const ghost = props.ghostNodes.find(g => g.id === targetId)
      const targetNode = props.nodes.find(n => n.id === targetId)
      bySwitch.set(targetId, {
        targetId,
        targetName: ghost?.name || targetNode?.name || targetId,
        targetRole: targetNode?.role,
        isGhost: !!ghost && !targetNode,
        links: [link]
      })
    }
  }

  return Array.from(bySwitch.values()).map(sw => {
    // Sub-group by LAG within this switch
    const lagMap = new Map<string, LagSubGroup>()
    for (const link of sw.links) {
      const key = link.lag_name ? `lag:${link.lag_group_id}` : `link:${link.id}`
      const existing = lagMap.get(key)
      if (existing) {
        existing.links.push(link)
      } else {
        lagMap.set(key, { key, lagName: link.lag_name, links: [link] })
      }
    }

    // Deduplicate VLANs across all links to this switch
    const allVlans = new Set<number>()
    for (const link of sw.links) {
      for (const v of link.vlans) allVlans.add(v)
    }

    return {
      ...sw,
      lagGroups: Array.from(lagMap.values()),
      vlans: Array.from(allVlans).sort((a, b) => a - b)
    }
  })
})
</script>
