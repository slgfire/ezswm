<template>
  <div
    class="group relative flex cursor-pointer items-center justify-center font-mono transition-all"
    :class="[
      portClasses,
      selected ? 'ring-2 ring-primary-500' : '',
      portShapeClasses
    ]"
    :style="portStyle"
    :title="portTitle"
  >
    <span class="text-xs font-medium">{{ port.index }}</span>
    <!-- Trunk indicator: top stripe -->
    <div v-if="isTrunk" class="absolute inset-x-0 top-0 h-[3px] rounded-t bg-yellow-400" />
    <!-- LAG indicator -->
    <div v-if="port.lag_group_id" class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-400" />
    <!-- Port type label below -->
    <span
      v-if="isQsfp"
      class="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold leading-none tracking-wide text-gray-400"
    >QSFP</span>
    <span
      v-else-if="isSfpType"
      class="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-semibold leading-none tracking-wide text-gray-400"
    >{{ port.type === 'sfp+' ? 'SFP+' : 'SFP' }}</span>
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

const portShapeClasses = computed(() => {
  if (isQsfp.value) return 'h-11 min-w-[3.25rem] rounded-t-lg rounded-b text-sm'
  if (isSfpType.value) return 'h-11 min-w-[2.75rem] rounded-t-lg rounded-b text-sm'
  if (isConsole.value) return 'h-10 min-w-[2.5rem] rounded border-amber-500/50'
  if (isManagement.value) return 'h-10 min-w-[2.5rem] rounded border-teal-500/50'
  return 'h-10 min-w-[2.5rem] rounded'
})

const portClasses = computed(() => {
  const status = props.port.status
  if (isConsole.value) return 'bg-gray-800 border border-amber-500/50 text-amber-400'
  if (isManagement.value) return 'bg-gray-800 border border-teal-500/50 text-teal-300'
  if (status === 'disabled') return 'bg-gray-800 border border-red-500/50 text-red-400'
  if (status === 'up') return 'bg-gray-700 border border-green-500/50 text-green-300'
  return 'bg-gray-800 border border-gray-600 text-gray-500'
})

const portStyle = computed(() => {
  if (!props.port.native_vlan || !props.vlans?.length) return {}
  const vlan = props.vlans.find(v => v.vlan_id === props.port.native_vlan)
  if (!vlan?.color) return {}
  return { backgroundColor: vlan.color + '33' }
})

const portTitle = computed(() => {
  const parts = [props.port.label || `Port ${props.port.unit}/${props.port.index}`]
  parts.push(`Status: ${props.port.status}`)
  parts.push(`Type: ${props.port.type}`)
  if (props.port.native_vlan) parts.push(`Native VLAN: ${props.port.native_vlan}`)
  if (props.port.tagged_vlans?.length) parts.push(`Tagged VLANs: ${props.port.tagged_vlans.join(', ')}`)
  if (props.port.connected_device) parts.push(`Connected: ${props.port.connected_device}`)
  return parts.join('\n')
})
</script>
