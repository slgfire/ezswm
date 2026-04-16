<template>
  <div class="space-y-3">
    <!-- Section header with toggle (desktop only) -->
    <button
      v-if="!alwaysExpanded"
      class="flex w-full items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2 text-left text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-800"
      @click="expanded = !expanded"
    >
      <span>{{ $t('public.helperTitle') }} ({{ freeCount }} {{ $t('public.helper.free') }})</span>
      <UIcon
        :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="h-4 w-4 text-gray-500"
      />
    </button>

    <template v-if="expanded || alwaysExpanded">
      <!-- Helper hint -->
      <div class="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
        {{ $t('public.helper.hint') }}
      </div>

      <!-- Network filter pills -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="f in networkFilters"
          :key="f.key"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
          :class="activeFilter === f.key
            ? 'bg-gray-600 text-white ring-1 ring-gray-500'
            : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200'"
          @click="activeFilter = f.key"
        >
          <span v-if="f.color" class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: f.color }" />
          {{ f.label }}
          <span class="text-[10px] opacity-60">({{ f.count }})</span>
        </button>
      </div>

      <!-- Port cards -->
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        <template v-for="port in sortedPorts" :key="port.id">
          <!-- Free usable port -->
          <div
            v-if="getPortCategory(port) === 'free'"
            class="rounded-lg border-2 border-emerald-500/40 bg-emerald-500/5 p-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-gray-100">{{ portLabel(port) }}</span>
              <span class="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                {{ $t('public.helper.free') }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center gap-2">
              <span v-if="getNetworkName(port)" class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" :style="networkBadgeStyle(port)">
                <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: getPortVlanColor(port) || '#888' }" />
                {{ getNetworkName(port) }}
              </span>
              <span v-else class="text-[11px] text-gray-500">{{ $t('public.helper.noNetwork') }}</span>
            </div>
          </div>

          <!-- Occupied port -->
          <div
            v-else-if="getPortCategory(port) === 'occupied'"
            class="rounded-lg border border-gray-700/50 bg-[#161616] p-3 opacity-60"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-400">{{ portLabel(port) }}</span>
              <span class="rounded-full bg-gray-700 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">
                {{ $t('public.helper.occupied') }}
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-[11px] text-gray-600">
              <span v-if="getNetworkName(port)" class="inline-flex items-center gap-1">
                <span class="inline-block h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: getPortVlanColor(port) || '#555' }" />
                {{ getNetworkName(port) }}
              </span>
              <span v-if="port.connected_device" class="truncate">· {{ port.connected_device }}</span>
            </div>
          </div>

          <!-- Technical / do-not-touch port -->
          <div
            v-else
            class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-400">{{ portLabel(port) }}</span>
              <span class="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                {{ $t('public.helper.techOnly') }}
              </span>
            </div>
            <div class="mt-1 text-[11px] text-amber-500/70">
              {{ $t('public.helper.doNotUse') }}
            </div>
          </div>
        </template>
      </div>

      <!-- Empty state when filter has no results -->
      <div v-if="sortedPorts.length === 0" class="py-6 text-center text-sm text-gray-500">
        {{ $t('public.helper.noPortsForFilter') }}
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

type PortCategory = 'free' | 'occupied' | 'technical'

const props = defineProps<{
  ports: PublicPort[]
  vlans: VlanDisplayInfo[]
  defaultExpanded?: boolean
  alwaysExpanded?: boolean
}>()

const { t } = useI18n()
const expanded = ref(props.defaultExpanded ?? false)
const activeFilter = ref<string>('free')

function getVlan(vlanId: number): VlanDisplayInfo | undefined {
  return props.vlans.find(v => v.vlan_id === vlanId)
}

function getPortVlanColor(port: PublicPort): string | null {
  const vid = port.access_vlan || port.native_vlan
  if (vid) return getVlan(vid)?.color ?? null
  return null
}

function portLabel(port: PublicPort): string {
  return port.label || `Port ${port.unit}/${port.index}`
}

// Categorise ports for non-technical helpers
function getPortCategory(port: PublicPort): PortCategory {
  // Trunk / uplink / multi-VLAN = technical, don't touch
  if (port.tagged_vlans.length > 0) return 'technical'
  // Console / management ports = technical
  if (port.type === 'console' || port.type === 'management') return 'technical'
  // Disabled = technical
  if (port.status === 'disabled') return 'technical'
  // Has a connected device or is up with a device = occupied
  if (port.connected_device) return 'occupied'
  if (port.status === 'up' && (port.access_vlan || port.native_vlan)) return 'occupied'
  // Has a VLAN assigned but no device = free participant port
  if (port.access_vlan || port.native_vlan) return 'free'
  // No VLAN, down, no device = free (unconfigured)
  if (port.status === 'down' && !port.connected_device) return 'free'
  return 'occupied'
}

function getNetworkName(port: PublicPort): string | null {
  const vid = port.access_vlan || port.native_vlan
  if (!vid) return null
  const vlan = getVlan(vid)
  return vlan?.name ?? null
}

function getNetworkVlanId(port: PublicPort): number | null {
  return port.access_vlan || port.native_vlan || null
}

function networkBadgeStyle(port: PublicPort): Record<string, string> {
  const color = getPortVlanColor(port) || '#888'
  return {
    backgroundColor: color + '20',
    color: color,
    borderColor: color + '40'
  }
}

// Build filter options from actual VLAN usage
const networkFilters = computed(() => {
  const filters: { key: string; label: string; color: string | null; count: number }[] = []

  // "Free" filter first
  const freePorts = props.ports.filter(p => getPortCategory(p) === 'free')
  filters.push({ key: 'free', label: t('public.helper.free'), color: null, count: freePorts.length })

  // Network-specific filters (from VLANs on participant ports)
  const vlanCounts = new Map<number, number>()
  for (const port of props.ports) {
    if (getPortCategory(port) === 'technical') continue
    const vid = getNetworkVlanId(port)
    if (vid) vlanCounts.set(vid, (vlanCounts.get(vid) || 0) + 1)
  }
  for (const [vid, count] of vlanCounts) {
    const vlan = getVlan(vid)
    if (vlan) {
      filters.push({ key: `vlan-${vid}`, label: vlan.name, color: vlan.color, count })
    }
  }

  // "Occupied" and "All" at the end
  const occupiedPorts = props.ports.filter(p => getPortCategory(p) === 'occupied')
  filters.push({ key: 'occupied', label: t('public.helper.occupied'), color: null, count: occupiedPorts.length })
  filters.push({ key: 'all', label: t('public.filter.all'), color: null, count: props.ports.length })

  return filters
})

const freeCount = computed(() => props.ports.filter(p => getPortCategory(p) === 'free').length)

const sortedPorts = computed(() => {
  let filtered: PublicPort[]

  if (activeFilter.value === 'free') {
    filtered = props.ports.filter(p => getPortCategory(p) === 'free')
  } else if (activeFilter.value === 'occupied') {
    filtered = props.ports.filter(p => getPortCategory(p) === 'occupied')
  } else if (activeFilter.value === 'all') {
    filtered = [...props.ports]
  } else if (activeFilter.value.startsWith('vlan-')) {
    const vid = parseInt(activeFilter.value.replace('vlan-', ''))
    filtered = props.ports.filter(p => {
      const cat = getPortCategory(p)
      if (cat === 'technical') return false
      return getNetworkVlanId(p) === vid
    })
  } else {
    filtered = [...props.ports]
  }

  // Sort: free first, then occupied, then technical
  const catOrder: Record<PortCategory, number> = { free: 0, occupied: 1, technical: 2 }
  return filtered.sort((a, b) => catOrder[getPortCategory(a)] - catOrder[getPortCategory(b)])
})
</script>
