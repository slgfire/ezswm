<template>
  <USelectMenu
    v-model="value"
    :items="options"
    placeholder="Select VLAN..."
    class="w-full"
    :ui="{ item: 'items-center', base: selectedVlan ? 'ps-8' : '' }"
  >
    <template v-if="selectedVlan" #leading>
      <span
        class="mr-1.5 size-3 shrink-0 rounded-full"
        :style="{ backgroundColor: selectedVlan.color }"
      />
    </template>
    <template #item-leading="{ item }">
      <span
        class="size-3 shrink-0 rounded-full"
        :style="{ backgroundColor: colorMap[(item as any).value] || '#888' }"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number | null | undefined
  vlans: any[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const options = computed(() => [
  { label: '— None —', value: 0 },
  ...props.vlans.map(v => ({
    label: `${v.vlan_id} · ${v.name}`,
    value: v.vlan_id
  }))
])

const colorMap = computed(() => {
  const map: Record<number, string> = {}
  for (const v of props.vlans) map[v.vlan_id] = v.color
  return map
})

const selectedVlan = computed(() => {
  if (!props.modelValue) return null
  return props.vlans.find(v => v.vlan_id === props.modelValue)
})

const value = computed({
  get() {
    return options.value.find(o => o.value === props.modelValue) || options.value[0]
  },
  set(val: any) {
    // value 0 = "None" = clear the VLAN
    emit('update:modelValue', val?.value ? val.value : null)
  }
})
</script>
