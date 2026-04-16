<template>
  <div class="space-y-3">
    <!-- Section header with toggle -->
    <button
      class="flex w-full items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800"
      @click="expanded = !expanded"
    >
      <span>{{ $t('public.title') }} ({{ occupiedCount }}/{{ ports.length }})</span>
      <UIcon
        :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="h-4 w-4 text-gray-500"
      />
    </button>

    <template v-if="expanded">
      <!-- Filter tabs -->
      <div class="flex gap-1 text-xs">
        <button
          v-for="f in filters"
          :key="f.key"
          class="rounded-md px-3 py-1.5 transition-colors"
          :class="activeFilter === f.key ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'"
          @click="activeFilter = f.key"
        >{{ f.label }} ({{ f.count }})</button>
      </div>

      <!-- Port cards -->
      <div class="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        <template v-for="port in filteredPorts" :key="port.id">
          <!-- Occupied port: full card -->
          <div
            v-if="isOccupied(port)"
            class="rounded-lg border border-gray-700 bg-[#161616] p-3"
            :style="getPortVlanColor(port) ? { borderLeftWidth: '3px', borderLeftColor: getPortVlanColor(port)! } : {}"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold">{{ port.label || `${port.unit}/${port.index}` }}</span>
                <span
                  class="text-[11px]"
                  :class="port.status === 'up' ? 'text-green-500' : port.status === 'disabled' ? 'text-red-400' : 'text-gray-600'"
                >&#9679; {{ port.status.toUpperCase() }}</span>
              </div>
              <span v-if="getVlanLabel(port)" class="text-[11px]" :style="{ color: getPortVlanColor(port) || '#888' }">
                {{ getVlanLabel(port) }}
              </span>
            </div>
            <div v-if="getPortDetails(port)" class="mt-1 text-xs text-gray-500">
              {{ getPortDetails(port) }}
            </div>
          </div>

          <!-- Unused port: compact single line -->
          <div
            v-else
            class="flex items-center justify-between rounded-lg border border-gray-800/30 bg-[#111] px-3 py-1.5 opacity-40"
          >
            <span class="text-xs text-gray-600">{{ port.label || `${port.unit}/${port.index}` }}</span>
            <span class="text-[10px] text-gray-700">{{ port.status.toUpperCase() }}</span>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { VlanDisplayInfo } from '~~/types/vlan'

interface PublicPort {
  id: string
  unit: number
  index: number
  label?: string
  type: string
  speed?: string
  status: string
  port_mode?: string
  access_vlan?: number
  native_vlan?: number
  tagged_vlans: number[]
  connected_device?: string
  description?: string
  poe?: unknown
}

const props = defineProps<{
  ports: PublicPort[]
  vlans: VlanDisplayInfo[]
}>()

const { t } = useI18n()
const expanded = ref(false)
const activeFilter = ref<'all' | 'occupied' | 'unused'>('occupied')

function isOccupied(port: PublicPort): boolean {
  return (
    port.status === 'up' ||
    !!port.connected_device ||
    !!port.access_vlan ||
    !!port.native_vlan ||
    port.tagged_vlans.length > 0
  )
}

const occupiedCount = computed(() => props.ports.filter(isOccupied).length)

const filters = computed(() => {
  return [
    { key: 'all' as const, label: t('public.filter.all'), count: props.ports.length },
    { key: 'occupied' as const, label: t('public.filter.occupied'), count: occupiedCount.value },
    { key: 'unused' as const, label: t('public.filter.unused'), count: props.ports.length - occupiedCount.value }
  ]
})

const filteredPorts = computed(() => {
  if (activeFilter.value === 'occupied') return props.ports.filter(isOccupied)
  if (activeFilter.value === 'unused') return props.ports.filter(p => !isOccupied(p))
  return props.ports
})

function getVlan(vlanId: number): VlanDisplayInfo | undefined {
  return props.vlans.find(v => v.vlan_id === vlanId)
}

function getPortVlanColor(port: PublicPort): string | null {
  const vid = port.access_vlan || port.native_vlan
  if (vid) return getVlan(vid)?.color ?? null
  if (port.tagged_vlans.length > 0) return getVlan(port.tagged_vlans[0]!)?.color ?? null
  return null
}

function getVlanLabel(port: PublicPort): string | null {
  if (port.tagged_vlans.length > 0) return t('public.port.trunk')
  const vid = port.access_vlan || port.native_vlan
  if (!vid) return null
  const vlan = getVlan(vid)
  return vlan ? `VLAN ${vid}` : null
}

function getPortDetails(port: PublicPort): string | null {
  const parts: string[] = []
  if (port.connected_device) parts.push(port.connected_device)
  if (port.speed) parts.push(port.speed)
  if (port.tagged_vlans.length > 0) {
    parts.push(`${t('public.port.vlans')} ${port.tagged_vlans.join(',')}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
</script>
