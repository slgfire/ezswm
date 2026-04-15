<template>
  <div class="print-only-flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[9px]" style="border-color: #ccc; color: #000;">
    <span style="font-weight: bold; color: #555;">VLANs:</span>
    <span
      v-for="vlan in usedVlans"
      :key="vlan.vlan_id"
      class="flex items-center gap-1"
    >
      <span
        class="inline-block h-2 w-2"
        style="border-radius: 1px; print-color-adjust: exact; -webkit-print-color-adjust: exact;"
        :style="{ backgroundColor: vlan.color }"
      />
      <b>{{ vlan.vlan_id }}</b> {{ vlan.name }}
    </span>
    <span style="color: #aaa;">|</span>
    <span class="flex items-center gap-1">
      <span class="inline-block h-2 w-2" style="border: 1px solid #999; border-radius: 0;" /> Access
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block h-2 w-2" style="border-radius: 50%; background: #999; box-shadow: 0 0 0 1px #fff, 0 0 0 2px #999;" /> Trunk
    </span>
    <span class="flex items-center gap-1">
      <span
        class="inline-block h-2 w-3"
        style="border: 1px solid #999; border-radius: 1px; background-image: repeating-linear-gradient(-45deg, #fff, #fff 1.5px, #ccc 1.5px, #ccc 2.5px);"
      /> LAG
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Port } from '~~/types/port'
import type { VLAN } from '~~/types/vlan'

const props = defineProps<{
  ports: Port[]
  vlans: VLAN[]
}>()

const usedVlans = computed(() => {
  if (!props.vlans?.length || !props.ports?.length) return []
  const usedIds = new Set<number>()
  for (const p of props.ports) {
    if (p.native_vlan) usedIds.add(p.native_vlan)
    if (p.access_vlan) usedIds.add(p.access_vlan)
    if (p.tagged_vlans) {
      for (const vid of p.tagged_vlans) usedIds.add(vid)
    }
  }
  return props.vlans
    .filter(v => usedIds.has(v.vlan_id) && v.color)
    .sort((a, b) => a.vlan_id - b.vlan_id)
})
</script>
