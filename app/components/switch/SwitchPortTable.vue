<template>
  <div class="rounded-lg border border-neutral-200 bg-default p-4 dark:border-neutral-800">
    <button
      class="flex w-full items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
      @click="expanded = !expanded"
    >
      <UIcon name="i-heroicons-chevron-right" :class="['h-4 w-4 transition-transform duration-200', expanded ? 'rotate-90' : '']" />
      <UIcon name="i-heroicons-table-cells" class="h-4 w-4 text-primary-500" />
      {{ $t('switches.portTable.title') }}
      <span class="text-xs font-normal text-gray-400">{{ $t('switches.portTable.portsCount', ports.length) }}</span>
      <span class="ml-auto flex items-center gap-3 text-xs font-normal">
        <span v-if="portStats.up" class="flex items-center gap-1 text-green-500">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          {{ $t('switches.portTable.upCount', { n: portStats.up }) }}
        </span>
        <span v-if="portStats.down" class="flex items-center gap-1 text-gray-400">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" />
          {{ $t('switches.portTable.downCount', { n: portStats.down }) }}
        </span>
        <span v-if="portStats.disabled" class="flex items-center gap-1 text-red-400">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
          {{ $t('switches.portTable.disabledCount', { n: portStats.disabled }) }}
        </span>
      </span>
    </button>
    <div v-show="expanded" class="mt-3 overflow-x-auto border-t border-default pt-3">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-200 text-[10px] uppercase tracking-wider text-gray-400 dark:border-neutral-700">
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.port') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.status') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.mode') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.vlan') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.connectedDevice') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.connectedPort') }}</th>
            <th class="px-3 py-2 font-medium">{{ $t('switches.portTable.description') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="port in ports"
            :key="port.id"
            class="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
            @click="$emit('select-port', port.id)"
          >
            <td class="whitespace-nowrap px-3 py-2 font-mono text-xs font-medium">
              {{ port.label || port.id }}
            </td>
            <td class="whitespace-nowrap px-3 py-2">
              <span class="flex items-center gap-1.5 text-xs">
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :class="statusColor(port.status)"
                />
                {{ port.status }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
              {{ port.port_mode || '--' }}
            </td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-1">
                <template v-if="port.port_mode === 'trunk'">
                  <span v-if="port.native_vlan" class="inline-flex items-center gap-1 text-xs">
                    <span
                      class="inline-block h-2 w-2 rounded"
                      :style="{ backgroundColor: getVlanColor(port.native_vlan) }"
                    />
                    <span class="text-gray-300">{{ getVlanLabel(port.native_vlan) }}</span>
                    <span class="text-[9px] text-gray-500">N</span>
                  </span>
                  <span v-for="vid in port.tagged_vlans" :key="vid" class="inline-flex items-center gap-1 text-xs">
                    <span
                      class="inline-block h-2 w-2 rounded"
                      :style="{ backgroundColor: getVlanColor(vid) }"
                    />
                    <span class="text-gray-400">{{ getVlanLabel(vid) }}</span>
                  </span>
                </template>
                <template v-else-if="port.access_vlan">
                  <span class="inline-flex items-center gap-1 text-xs">
                    <span
                      class="inline-block h-2 w-2 rounded"
                      :style="{ backgroundColor: getVlanColor(port.access_vlan) }"
                    />
                    <span class="text-gray-400">{{ getVlanLabel(port.access_vlan) }}</span>
                  </span>
                </template>
                <span v-else class="text-xs text-gray-500">--</span>
              </div>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-xs">
              <span v-if="port.connected_device" class="text-gray-300">{{ port.connected_device }}</span>
              <span v-else class="text-gray-500">--</span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-xs">
              <span v-if="port.connected_port" class="font-mono text-gray-400">{{ port.connected_port }}</span>
              <span v-else class="text-gray-500">--</span>
            </td>
            <td class="max-w-[200px] truncate px-3 py-2 text-xs text-gray-400">
              {{ port.description || '--' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Port } from '~~/types'

const props = defineProps<{
  ports: Port[]
  vlans: { id: string; vlan_id: number; name: string; color?: string }[]
}>()

defineEmits<{
  'select-port': [portId: string]
}>()

const expanded = ref(false)

const portStats = computed(() => ({
  up: props.ports.filter(p => p.status === 'up').length,
  down: props.ports.filter(p => p.status === 'down').length,
  disabled: props.ports.filter(p => p.status === 'disabled').length,
}))

const vlanMap = computed(() => {
  const map = new Map<number, { name: string; color?: string }>()
  for (const v of props.vlans) {
    map.set(v.vlan_id, { name: v.name, color: v.color })
  }
  return map
})

function getVlanLabel(vlanId: number): string {
  const v = vlanMap.value.get(vlanId)
  return v ? `${v.name} (${vlanId})` : String(vlanId)
}

function getVlanColor(vlanId: number): string {
  return vlanMap.value.get(vlanId)?.color || '#6b7280'
}

function statusColor(status: string): string {
  if (status === 'up') return 'bg-green-500'
  if (status === 'disabled') return 'bg-red-500'
  return 'bg-gray-400'
}
</script>
