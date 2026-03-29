<template>
  <div
    class="port-glow group relative flex cursor-pointer flex-col items-center justify-center font-mono transition-all"
    :class="[
      portClasses,
      selected ? 'ring-2 ring-primary-500' : '',
      portShapeClasses
    ]"
    :style="portStyle"
  >
    <span class="text-xs font-semibold leading-none">{{ port.index }}</span>
    <span
      v-if="typeLabel"
      class="mt-0.5 text-[7px] font-medium leading-none opacity-60"
    >{{ typeLabel }}</span>
    <!-- VLAN indicator (top-right): trunk = circle, access = square -->
    <div v-if="isTrunk" class="group/vlan absolute -top-2 -right-2 p-1">
      <div class="h-2.5 w-2.5 rounded-full ring-1 ring-white dark:ring-gray-900" :style="{ backgroundColor: vlanDotColor || '#FBBF24' }" />
      <div class="pointer-events-none absolute left-0 top-full z-50 hidden min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg group-hover/vlan:block">
        <div class="space-y-1 text-xs">
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
        </div>
      </div>
    </div>
    <div v-else-if="vlanDotColor" class="group/vlan absolute -top-2 -right-2 p-1">
      <div class="h-2.5 w-2.5 rounded-sm ring-1 ring-white dark:ring-gray-900" :style="{ backgroundColor: vlanDotColor }" />
      <div class="pointer-events-none absolute left-0 top-full z-50 hidden min-w-[10rem] rounded-md border border-default bg-default p-2 shadow-lg group-hover/vlan:block">
        <div class="space-y-1 text-xs">
          <div class="font-semibold text-gray-700 dark:text-gray-200">Access</div>
          <div class="flex items-center gap-1.5">
            <div class="h-2 w-2 flex-shrink-0 rounded-sm" :style="{ backgroundColor: vlanDotColor }" />
            <span class="font-medium text-gray-700 dark:text-gray-200">{{ port.access_vlan || port.native_vlan }}</span>
            <span class="text-gray-400">{{ getVlanName(port.access_vlan || port.native_vlan) }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- PoE glow is applied via portStyle computed (box-shadow) -->
    <!-- LAG indicator: colored bottom border -->
    <div v-if="port.lag_group_id" class="absolute inset-x-0 bottom-0 h-[3px] rounded-b" :style="{ backgroundColor: lagColor }" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  port: any
  vlans?: any[]
  selected: boolean
}>()

const isTrunk = computed(() => props.port.tagged_vlans && props.port.tagged_vlans.length > 0)
const isQsfp = computed(() => props.port.type === 'qsfp')
const isSfpType = computed(() => props.port.type === 'sfp' || props.port.type === 'sfp+')
const isConsole = computed(() => props.port.type === 'console')
const isManagement = computed(() => props.port.type === 'management')

const typeLabel = computed(() => {
  if (isQsfp.value) return 'Q'
  if (props.port.type === 'sfp+') return 'S+'
  if (props.port.type === 'sfp') return 'S'
  if (isConsole.value) return 'CON'
  if (isManagement.value) return 'MGT'
  return ''
})

// Deterministic color from LAG group ID — same ID always gets same color
const lagColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#84CC16']
const lagColor = computed(() => {
  if (!props.port.lag_group_id) return ''
  let hash = 0
  for (const ch of props.port.lag_group_id) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return lagColors[Math.abs(hash) % lagColors.length]
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
  // Access mode: use access_vlan, Trunk mode: use native_vlan
  const vlanId = props.port.access_vlan || props.port.native_vlan
  if (!vlanId) return null
  const vlan = props.vlans.find(v => v.vlan_id === vlanId)
  return vlan?.color || null
})

const portStyle = computed(() => {
  if (props.port.poe) {
    return { boxShadow: '0 0 5px 1px rgba(251, 191, 36, 0.4)' }
  }
  return {}
})
</script>
