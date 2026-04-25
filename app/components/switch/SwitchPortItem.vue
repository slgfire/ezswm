<template>
  <div
    ref="portEl"
    class="port-glow group relative flex flex-col items-center justify-center font-mono transition-all"
    :class="[
      publicMode ? 'cursor-default' : 'cursor-pointer',
      portClasses,
      selected ? 'ring-2 ring-primary-500' : '',
      portShapeClasses,
      props.lagGroup ? 'lag-stripe' : '',
      props.dimmed ? 'lag-dimmed' : '',
      vlanTintClass
    ]"
    :style="portStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="hovered = false"
  >
    <span class="relative z-10 text-xs font-semibold leading-none">{{ port.index }}</span>
    <span
      v-if="typeLabel"
      class="relative z-10 mt-0.5 text-[7px] font-medium leading-none"
      :class="port.poe ? 'text-amber-400' : 'opacity-80'"
    >{{ typeLabel }}</span>

    <!-- VLAN indicator dot (top-right) -->
    <template v-if="printMode">
      <!-- Print mode: trunk = black dot, access = hidden (background shows color) -->
      <div v-if="isTrunk" class="absolute -top-2 -right-2 p-1">
        <div class="print-trunk-dot" style="width: 16px; height: 16px; border-radius: 50%; background: #000;" />
      </div>
    </template>
    <template v-else>
      <!-- Screen mode: trunk = circle with ring, access = sharp square -->
      <div v-if="isTrunk" class="absolute -top-2 -right-2 p-1">
        <div class="h-3 w-3 rounded-full" :style="{ backgroundColor: vlanDotColor || '#FBBF24', boxShadow: '0 0 0 2px var(--ui-bg, #0a0a0a), 0 0 0 3px ' + (vlanDotColor || '#FBBF24') }" />
      </div>
      <div v-else-if="vlanDotColor" class="absolute -top-2 -right-2 p-1">
        <div class="h-2.5 w-2.5 ring-1 ring-white dark:ring-gray-900" style="border-radius: 0" :style="{ backgroundColor: vlanDotColor }" />
      </div>
    </template>

    <!-- Combined hover tooltip (VLAN + LAG info) -->
    <Teleport to="body">
    <div v-if="hasTooltipContent && !printMode && !publicMode" v-show="hovered" class="pointer-events-none fixed z-[9999] min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg" :style="tooltipStyle">
      <div class="space-y-1.5 text-xs">
        <!-- VLAN section -->
        <template v-if="isTrunk">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Trunk</div>
          <div v-if="port.native_vlan" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(port.native_vlan) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.native_vlan }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(port.native_vlan) }}</span>
            <span class="ml-auto flex-shrink-0 text-[10px] text-primary-500">N</span>
          </div>
          <div v-for="vid in port.tagged_vlans" :key="vid" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(vid) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ vid }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(vid) }}</span>
          </div>
        </template>
        <template v-else-if="vlanDotColor">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Access</div>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded-sm" :style="{ backgroundColor: vlanDotColor }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.access_vlan || port.native_vlan }}</span>
            <span class="text-gray-400">{{ getVlanName((port.access_vlan || port.native_vlan)!) }}</span>
          </div>
        </template>

        <!-- Separator -->
        <div v-if="(isTrunk || vlanDotColor) && (lagGroup || port.connected_device)" class="border-t border-default" />

        <!-- LAG section -->
        <template v-if="lagGroup">
          <div class="font-semibold text-gray-700 dark:text-gray-200">{{ lagGroup.name }}</div>
          <div class="text-gray-400">{{ lagGroup.port_ids?.length || 0 }} {{ $t('lag.ports') }}</div>
          <div v-if="lagGroup.remote_device" class="text-gray-400">→ {{ lagGroup.remote_device }}</div>
        </template>

        <!-- Connected device (when not in a LAG) -->
        <template v-else-if="port.connected_device">
          <div class="flex items-center gap-1.5 text-gray-400">
            <UIcon name="i-heroicons-link" class="h-3 w-3 shrink-0" />
            <span class="truncate">{{ port.connected_device }}</span>
          </div>
          <div v-if="port.connected_port" class="text-gray-500 pl-[1.125rem]">{{ port.connected_port }}</div>
        </template>
      </div>
    </div>
    </Teleport>

    <!-- Public mode: read-only info tooltip -->
    <Teleport to="body">
    <div v-if="hasTooltipContent && publicMode" v-show="hovered" class="pointer-events-none fixed z-[9999] min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg" :style="tooltipStyle">
      <div class="space-y-1.5 text-xs">
        <template v-if="isTrunk">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Trunk</div>
          <div v-if="port.native_vlan" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(port.native_vlan) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.native_vlan }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(port.native_vlan) }}</span>
            <span class="ml-auto flex-shrink-0 text-[10px] text-primary-500">N</span>
          </div>
          <div v-for="vid in port.tagged_vlans" :key="vid" class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded" :style="{ backgroundColor: getVlanColor(vid) }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ vid }}</span>
            <span class="truncate text-gray-400">{{ getVlanName(vid) }}</span>
          </div>
        </template>
        <template v-else-if="vlanDotColor">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Access</div>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded-sm" :style="{ backgroundColor: vlanDotColor }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.access_vlan || port.native_vlan }}</span>
            <span class="text-gray-400">{{ getVlanName((port.access_vlan || port.native_vlan)!) }}</span>
          </div>
        </template>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Port } from '~~/types/port'
import type { VlanDisplayInfo } from '~~/types/vlan'
import type { LAGGroup } from '~~/types/lagGroup'

const props = defineProps<{
  port: Port
  vlans?: VlanDisplayInfo[]
  selected: boolean
  lagGroup?: LAGGroup
  dimmed?: boolean
  printMode?: boolean
  publicMode?: boolean
}>()

const hovered = ref(false)
const portEl = ref<HTMLElement | null>(null)
const tooltipPos = reactive({ top: 0, left: 0 })

const tooltipStyle = computed(() => ({
  top: `${tooltipPos.top}px`,
  left: `${tooltipPos.left}px`,
  transform: 'translateY(0)'
}))

function onMouseEnter() {
  if (portEl.value) {
    const rect = portEl.value.getBoundingClientRect()
    tooltipPos.top = rect.bottom + 4  // position below the port, small gap
    tooltipPos.left = rect.left
  }
  hovered.value = true
}
const isTrunk = computed(() => props.port.tagged_vlans && props.port.tagged_vlans.length > 0)
const isQsfp = computed(() => props.port.type === 'qsfp')
const isSfpType = computed(() => props.port.type === 'sfp' || props.port.type === 'sfp+')
const isConsole = computed(() => props.port.type === 'console')
const isManagement = computed(() => props.port.type === 'management')

// Show tooltip if port has VLAN info, LAG info, or connected device
const hasTooltipContent = computed(() => isTrunk.value || vlanDotColor.value || props.lagGroup || props.port.connected_device)

const typeLabel = computed(() => {
  if (isQsfp.value) return 'Q'
  if (props.port.type === 'sfp+') return 'S+'
  if (props.port.type === 'sfp') return 'S'
  if (isConsole.value) return 'CON'
  if (isManagement.value) return 'MGT'
  if (props.port.poe) return 'PoE'
  return ''
})

const portShapeClasses = computed(() => {
  if (isQsfp.value) return 'h-11 min-w-[2.75rem] rounded border-l-[3px] border-l-violet-400 dark:border-l-violet-500'
  if (isSfpType.value) return 'h-11 min-w-[2.5rem] rounded border-l-[3px] border-l-sky-400 dark:border-l-sky-500'
  if (isConsole.value) return 'h-10 min-w-[2.5rem] rounded border-l-[3px] border-l-amber-400 dark:border-l-amber-500'
  if (isManagement.value) return 'h-10 min-w-[2.5rem] rounded border-l-[3px] border-l-teal-400 dark:border-l-teal-500'
  return 'h-10 min-w-[2.5rem] rounded'
})

const portClasses = computed(() => {
  const status = props.port.status
  if (status === 'disabled') return 'bg-red-50 border border-red-300 text-red-500 dark:bg-neutral-800 dark:border-red-500/50 dark:text-red-400'
  if (status === 'up') return 'bg-green-50 border border-green-300 text-green-700 dark:bg-neutral-700 dark:border-green-500/50 dark:text-green-300'
  return 'bg-gray-100 border border-gray-300 text-gray-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-gray-500'
})

function getVlanColor(vlanId: number): string {
  const vlan = props.vlans?.find(v => v.vlan_id === vlanId)
  return vlan?.color || '#888'
}

function getVlanName(vlanId: number): string {
  const vlan = props.vlans?.find(v => v.vlan_id === vlanId)
  return vlan?.name || ''
}

const vlanDotColor = computed(() => {
  if (!props.vlans?.length) return null
  const vlanId = props.port.access_vlan || props.port.native_vlan
  if (!vlanId) return null
  const vlan = props.vlans.find(v => v.vlan_id === vlanId)
  return vlan?.color || null
})

const vlanTintClass = computed(() => {
  return (vlanDotColor.value && !isTrunk.value) ? 'has-vlan-tint' : ''
})

const portStyle = computed(() => {
  if (vlanDotColor.value && !isTrunk.value) {
    return { '--vlan-tint': vlanDotColor.value + 'D9' }
  }
  return {}
})
</script>
