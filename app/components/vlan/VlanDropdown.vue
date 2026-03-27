<template>
  <USelectMenu
    :search-input="false"
    v-model="selected"
    :items="options"
    value-key="value"
    placeholder="— None —"
    class="w-full"
    @update:model-value="onSelect"
  >
    <template #leading>
      <span
        v-if="selectedVlan"
        class="inline-block h-3 w-3 shrink-0 rounded-full"
        :style="{ backgroundColor: selectedVlan.color }"
      />
    </template>
    <template #item-leading="{ item }">
      <span
        class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        :style="{ backgroundColor: colorMap[item.value] }"
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

const selected = ref<number | null>(props.modelValue ?? null)

watch(() => props.modelValue, (val) => {
  selected.value = val ?? null
})

const selectedVlan = computed(() => {
  if (!selected.value) return null
  return props.vlans.find(v => v.vlan_id === selected.value)
})

function onSelect(value: any) {
  selected.value = value
  emit('update:modelValue', value ?? null)
}
</script>
