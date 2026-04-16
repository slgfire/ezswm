<template>
  <div class="space-y-3">
    <!-- Helper hint -->
    <div class="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
      {{ $t('public.helper.hint') }}
    </div>

    <!-- Filter chips -->
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="f in filterChips"
        :key="f.key"
        class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        :class="activeFilter === f.key
          ? 'bg-gray-600 text-white ring-1 ring-gray-500'
          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200'"
        @click="activeFilter = f.key"
      >
        <span v-if="f.color" class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: f.color }" />
        <span v-else-if="f.key === 'forbidden'" class="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
        {{ f.label }}
        <span class="text-[10px] opacity-60">{{ f.count }}</span>
      </button>
    </div>

    <!-- Port cards -->
    <div class="grid grid-cols-1 gap-1.5 md:grid-cols-2 lg:grid-cols-3">
      <template v-for="port in filteredPorts" :key="port.id">
        <!-- Forbidden infrastructure port -->
        <div
          v-if="getHelperUsage(port) === 'forbidden'"
          class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-gray-400">{{ portLabel(port) }}</span>
            <span class="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
              {{ $t('public.helper.techOnly') }}
            </span>
          </div>
          <div class="mt-1 text-[11px] text-amber-500/70">
            {{ $t('public.helper.doNotUse') }}
          </div>
        </div>

        <!-- Normal or special-device port -->
        <div
          v-else
          class="rounded-lg border bg-[#161616] p-3"
          :style="portBorderStyle(port)"
        >
          <!-- Row 1: port label + VLAN badge -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-gray-200">{{ portLabel(port) }}</span>
            <span
              v-if="getPrimaryVlanId(port)"
              class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :style="vlanChipStyle(port)"
            >VLAN {{ getPrimaryVlanId(port) }}</span>
            <span
              v-else-if="getHelperUsage(port) === 'special'"
              class="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-400"
            >{{ $t('public.helper.specialDevice') }}</span>
          </div>

          <!-- Row 2: VLAN name / purpose or special purpose -->
          <div class="mt-1 text-sm font-medium" :style="{ color: getPrimaryVlanColor(port) || '#888' }">
            {{ getPortPurpose(port) }}
          </div>

          <!-- Row 3: secondary info (description, device, tagged VLANs) -->
          <div v-if="getSecondaryInfo(port)" class="mt-1 text-[11px] text-gray-500">
            {{ getSecondaryInfo(port) }}
          </div>
        </div>
      </template>
    </div>

    <!-- Empty filter state -->
    <div v-if="filteredPorts.length === 0" class="py-6 text-center text-sm text-gray-500">
      {{ $t('public.helper.noPortsForFilter') }}
    </div>
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
  is_uplink?: boolean
}

// Helper-facing usage classification
type HelperUsage = 'normal' | 'special' | 'forbidden'

const props = defineProps<{
  ports: PublicPort[]
  vlans: VlanDisplayInfo[]
}>()

const { t } = useI18n()
const activeFilter = ref<string>('all')

function getVlan(vlanId: number): VlanDisplayInfo | undefined {
  return props.vlans.find(v => v.vlan_id === vlanId)
}

function portLabel(port: PublicPort): string {
  return port.label || `Port ${port.unit}/${port.index}`
}

// Classify port for helper view
function getHelperUsage(port: PublicPort): HelperUsage {
  // Console / management ports = always forbidden
  if (port.type === 'console' || port.type === 'management') return 'forbidden'
  // Disabled ports = forbidden
  if (port.status === 'disabled') return 'forbidden'
  // Switch uplink (connected to another switch) = forbidden
  if (port.is_uplink) return 'forbidden'
  // Trunk port that is NOT an uplink = special device (phone, AP, etc.)
  if (port.tagged_vlans.length > 0) return 'special'
  // Everything else = normal participant port
  return 'normal'
}

// Primary VLAN: access/native for normal ports, native for trunk/special
function getPrimaryVlanId(port: PublicPort): number | null {
  return port.access_vlan || port.native_vlan || null
}

function getPrimaryVlanColor(port: PublicPort): string | null {
  const vid = getPrimaryVlanId(port)
  if (!vid) return null
  return getVlan(vid)?.color ?? null
}

function getPrimaryVlanName(port: PublicPort): string | null {
  const vid = getPrimaryVlanId(port)
  if (!vid) return null
  return getVlan(vid)?.name ?? null
}

// What to show as the main purpose line
function getPortPurpose(port: PublicPort): string {
  const usage = getHelperUsage(port)

  if (usage === 'special') {
    // Show description if available (e.g. "Phone + PC", "Access Point")
    if (port.description) return port.description
    // Fallback: show tagged VLAN names
    const names = port.tagged_vlans
      .map(vid => getVlan(vid)?.name || `VLAN ${vid}`)
      .join(', ')
    const native = getPrimaryVlanName(port)
    return native ? `${native} + ${names}` : names
  }

  // Normal port: show VLAN name
  return getPrimaryVlanName(port) || t('public.helper.noNetwork')
}

// Secondary info line
function getSecondaryInfo(port: PublicPort): string | null {
  const parts: string[] = []
  const usage = getHelperUsage(port)

  // For normal ports, show description if set
  if (usage === 'normal' && port.description) {
    parts.push(port.description)
  }

  // Show connected device if present
  if (port.connected_device) parts.push(port.connected_device)

  // For special ports, show tagged VLANs as secondary metadata
  if (usage === 'special' && !port.description) {
    // Already shown in purpose line
  } else if (usage === 'special' && port.description) {
    // Description is in purpose, show VLANs here
    const names = port.tagged_vlans
      .map(vid => getVlan(vid)?.name || `VLAN ${vid}`)
      .join(', ')
    if (names) parts.push(names)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

function portBorderStyle(port: PublicPort): Record<string, string> {
  const usage = getHelperUsage(port)
  if (usage === 'special') {
    return { borderLeftWidth: '3px', borderLeftColor: '#38bdf8', borderColor: 'rgba(55,65,81,0.5)' }
  }
  const color = getPrimaryVlanColor(port)
  if (!color) return { borderColor: 'rgba(55,65,81,0.5)' }
  return { borderLeftWidth: '3px', borderLeftColor: color, borderColor: 'rgba(55,65,81,0.5)' }
}

function vlanChipStyle(port: PublicPort): Record<string, string> {
  const color = getPrimaryVlanColor(port) || '#888'
  return { backgroundColor: color + '25', color }
}

// Build filter chips
const filterChips = computed(() => {
  const chips: { key: string; label: string; color: string | null; count: number }[] = []

  // "All" first
  chips.push({ key: 'all', label: t('public.filter.all'), color: null, count: props.ports.length })

  // Per-VLAN filters (from non-forbidden ports)
  const vlanCounts = new Map<number, number>()
  for (const port of props.ports) {
    if (getHelperUsage(port) === 'forbidden') continue
    const vid = getPrimaryVlanId(port)
    if (vid) vlanCounts.set(vid, (vlanCounts.get(vid) || 0) + 1)
  }
  for (const [vid, count] of vlanCounts) {
    const vlan = getVlan(vid)
    if (vlan) {
      chips.push({ key: `vlan-${vid}`, label: vlan.name, color: vlan.color, count })
    }
  }

  // "Special device" if any
  const specialCount = props.ports.filter(p => getHelperUsage(p) === 'special').length
  if (specialCount > 0) {
    chips.push({ key: 'special', label: t('public.helper.specialDevice'), color: '#38bdf8', count: specialCount })
  }

  // "Tech only" at the end
  const forbiddenCount = props.ports.filter(p => getHelperUsage(p) === 'forbidden').length
  if (forbiddenCount > 0) {
    chips.push({ key: 'forbidden', label: t('public.helper.techOnly'), color: null, count: forbiddenCount })
  }

  return chips
})

const filteredPorts = computed(() => {
  let ports: PublicPort[]

  if (activeFilter.value === 'all') {
    ports = [...props.ports]
  } else if (activeFilter.value === 'forbidden') {
    ports = props.ports.filter(p => getHelperUsage(p) === 'forbidden')
  } else if (activeFilter.value === 'special') {
    ports = props.ports.filter(p => getHelperUsage(p) === 'special')
  } else if (activeFilter.value.startsWith('vlan-')) {
    const vid = parseInt(activeFilter.value.replace('vlan-', ''))
    ports = props.ports.filter(p => getHelperUsage(p) !== 'forbidden' && getPrimaryVlanId(p) === vid)
  } else {
    ports = [...props.ports]
  }

  // Sort: normal first, then special, then forbidden — within each group by unit/index
  const usageOrder: Record<HelperUsage, number> = { normal: 0, special: 1, forbidden: 2 }
  return ports.sort((a, b) => {
    const ua = usageOrder[getHelperUsage(a)]
    const ub = usageOrder[getHelperUsage(b)]
    if (ua !== ub) return ua - ub
    return a.unit * 1000 + a.index - (b.unit * 1000 + b.index)
  })
})
</script>
