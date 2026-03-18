<template>
  <div
    class="group relative flex cursor-pointer flex-col items-center justify-center font-mono transition-all"
    :class="[
      portClasses,
      selected ? 'ring-2 ring-primary-500' : '',
      portShapeClasses
    ]"
    :style="portStyle"
    :title="portTitle"
  >
    <span class="text-xs font-semibold leading-none">{{ port.index }}</span>
    <span
      v-if="typeLabel"
      class="mt-0.5 text-[7px] font-medium leading-none opacity-60"
    >{{ typeLabel }}</span>
    <!-- VLAN dot (top-right): native VLAN color or yellow for trunk -->
    <div v-if="isTrunk" class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-yellow-400 ring-1 ring-white dark:ring-gray-900" :title="`Trunk: ${port.tagged_vlans.join(', ')}`" />
    <div v-else-if="vlanDotColor" class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-1 ring-white dark:ring-gray-900" :style="{ backgroundColor: vlanDotColor }" :title="`VLAN ${port.native_vlan}`" />
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
  if (status === 'disabled') return 'bg-red-50 border border-red-300 text-red-500 dark:bg-gray-800 dark:border-red-500/50 dark:text-red-400'
  if (status === 'up') return 'bg-green-50 border border-green-300 text-green-700 dark:bg-gray-700 dark:border-green-500/50 dark:text-green-300'
  return 'bg-gray-100 border border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500'
})

const vlanDotColor = computed(() => {
  if (!props.port.native_vlan || !props.vlans?.length) return null
  const vlan = props.vlans.find(v => v.vlan_id === props.port.native_vlan)
  return vlan?.color || null
})

const portStyle = computed(() => {
  return {}
})

const portTitle = computed(() => {
  const parts = [props.port.label || `Port ${props.port.unit}/${props.port.index}`]
  parts.push(`Status: ${props.port.status}`)
  parts.push(`Type: ${props.port.type}`)
  if (props.port.native_vlan) parts.push(`Native VLAN: ${props.port.native_vlan}`)
  if (props.port.tagged_vlans?.length) parts.push(`Tagged VLANs: ${props.port.tagged_vlans.join(', ')}`)
  if (props.port.lag_group_id) parts.push(`LAG: ${props.port.lag_group_id}`)
  if (props.port.connected_device) {
    const connStr = props.port.connected_port
      ? `${props.port.connected_device} → ${props.port.connected_port}`
      : props.port.connected_device
    parts.push(`Connected: ${connStr}`)
  }
  return parts.join('\n')
})
</script>
