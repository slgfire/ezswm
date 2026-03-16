<template>
  <div
    class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded text-xs font-mono transition-all"
    :class="[
      portClasses,
      selected ? 'ring-2 ring-primary-500' : '',
      port.type === 'sfp' || port.type === 'sfp+' ? 'h-10 w-6' : ''
    ]"
    :style="portStyle"
    :title="portTitle"
  >
    <span class="text-[10px]">{{ port.index }}</span>
    <div v-if="isTrunk" class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-400" />
    <div v-if="port.lag_group_id" class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-400" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  port: any
  selected: boolean
}>()

const isTrunk = computed(() => props.port.tagged_vlans && props.port.tagged_vlans.length > 0)

const portClasses = computed(() => {
  const status = props.port.status
  if (status === 'disabled') return 'bg-gray-800 border border-red-500/50 text-red-400'
  if (status === 'up') return 'bg-gray-700 border border-green-500/50 text-green-300'
  return 'bg-gray-800 border border-gray-600 text-gray-500'
})

const portStyle = computed(() => {
  // If port has a native_vlan color, tint the background
  // This would require VLAN color data passed down - for now use status-based
  return {}
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
