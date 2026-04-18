<template>
  <USlideover
    v-model:open="isOpen"
    :title="node?.name || ''"
    :description="node ? [node.manufacturer, node.model].filter(Boolean).join(' · ') : ''"
  >
    <template #body>
      <div v-if="node" class="space-y-4">
        <!-- Role badge + Info -->
        <div>
          <UBadge v-if="node.role" :color="roleColor(node.role)" variant="subtle" size="sm" class="mb-3">
            {{ node.role }}
          </UBadge>

          <div class="space-y-1.5 text-sm">
            <div v-if="node.location" class="flex items-center gap-2">
              <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
              <span class="text-gray-500 dark:text-gray-400">{{ node.location }}</span>
            </div>
            <div v-if="node.management_ip" class="flex items-center gap-2">
              <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
              <span class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ node.management_ip }}</span>
            </div>
          </div>
        </div>

        <!-- Port footer -->
        <div class="flex items-center justify-between border-t border-b border-default py-2 font-mono">
          <span class="text-xs font-medium uppercase tracking-wider text-gray-400">
            {{ node.port_count }} {{ $t('topology.ports') }}
          </span>
          <div class="flex items-center gap-3 text-xs">
            <span v-if="node.ports_up" class="flex items-center gap-1 text-green-500">
              <span class="inline-block h-2 w-2 rounded-full bg-green-500" />
              {{ node.ports_up }}
            </span>
            <span v-if="node.ports_down" class="flex items-center gap-1 text-gray-400">
              <span class="inline-block h-2 w-2 rounded-full bg-gray-400" />
              {{ node.ports_down }}
            </span>
            <span v-if="node.ports_disabled" class="flex items-center gap-1 text-red-500">
              <span class="inline-block h-2 w-2 rounded-full bg-red-500" />
              {{ node.ports_disabled }}
            </span>
          </div>
        </div>

        <!-- Connections -->
        <div v-if="groupedConnections.length">
          <div class="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
            {{ $t('topology.connections') }} ({{ nodeLinks.length }})
          </div>
          <div class="space-y-2">
            <div
              v-for="group in groupedConnections"
              :key="group.key"
            >
              <div v-if="group.lagName" class="text-xs text-gray-500 mb-1 font-medium">
                LAG: {{ group.lagName }} ({{ group.links.length }})
              </div>
              <div
                v-for="link in group.links"
                :key="link.id"
                class="card-glow rounded-lg p-3"
                :class="[
                  group.isGhost ? 'opacity-60 cursor-default' : 'cursor-pointer',
                  ''
                ]"
                @click="!group.isGhost && $emit('select-node', group.targetId)"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ group.targetName }}
                  </span>
                  <UBadge
                    v-if="group.isGhost"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    {{ $t('topology.crossSite') }}
                  </UBadge>
                  <UBadge
                    v-else-if="group.targetRole"
                    :color="roleColor(group.targetRole)"
                    variant="subtle"
                    size="xs"
                  >
                    {{ group.targetRole }}
                  </UBadge>
                </div>
                <div class="font-mono text-xs text-gray-500 mb-1">
                  {{ link.source_port_label }} ↔ {{ link.target_port_label }}
                </div>
                <div v-if="link.vlans.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="vlan in link.vlans"
                    :key="vlan"
                    class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-neutral-800 dark:text-gray-400"
                  >
                    VLAN {{ vlan }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2">
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
      </div>
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

interface ConnectionGroup {
  key: string
  targetId: string
  targetName: string
  targetRole?: string
  isGhost: boolean
  lagName?: string
  links: TopologyLink[]
}

const groupedConnections = computed((): ConnectionGroup[] => {
  if (!props.node) return []

  const groups = new Map<string, ConnectionGroup>()

  for (const link of nodeLinks.value) {
    const targetId = link.source_switch_id === props.node!.id
      ? link.target_switch_id
      : link.source_switch_id

    const ghost = props.ghostNodes.find(g => g.id === targetId)
    const targetNode = props.nodes.find(n => n.id === targetId)
    const isGhost = !!ghost && !targetNode

    const groupKey = link.lag_name
      ? `${targetId}:lag:${link.lag_group_id}`
      : `${targetId}:link:${link.id}`

    const existing = groups.get(groupKey)
    if (existing) {
      existing.links.push(link)
    } else {
      groups.set(groupKey, {
        key: groupKey,
        targetId,
        targetName: ghost?.name || targetNode?.name || targetId,
        targetRole: targetNode?.role,
        isGhost,
        lagName: link.lag_name,
        links: [link]
      })
    }
  }

  return Array.from(groups.values())
})
</script>
