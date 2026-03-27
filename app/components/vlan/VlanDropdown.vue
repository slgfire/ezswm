<template>
  <USelectMenu
    :search-input="false"
    v-model="value"
    :items="options"
    icon="i-heroicons-tag"
    placeholder="Select VLAN..."
    class="w-full"
  >
    <template #leading>
      <span
        v-if="selectedVlan"
        class="inline-block h-3 w-3 shrink-0 rounded-full"
        :style="{ backgroundColor: selectedVlan.color }"
      />
      <UIcon v-else name="i-heroicons-tag" class="h-4 w-4 shrink-0 text-gray-400" />
    </template>
    <template #item-leading="{ item }">
      <span
        class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
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

const options = computed(() =>
  props.vlans.map(v => ({
    label: `${v.vlan_id} · ${v.name}`,
    value: v.vlan_id
  }))
)

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
    return options.value.find(o => o.value === props.modelValue) || undefined
  },
  set(val: any) {
    emit('update:modelValue', val?.value ?? null)
  }
})
</script>
