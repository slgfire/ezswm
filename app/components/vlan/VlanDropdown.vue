<template>
  <USelectMenu :search-input="false"
    :model-value="selectedOption"
    :items="options"
    :searchable="vlans.length > 5"
    searchable-placeholder="Search VLAN..."
    option-attribute="label"
    by="value"
    @update:model-value="onSelect"
  >
    <template #label>
      <div v-if="selectedVlan" class="flex items-center gap-2">
        <div class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: selectedVlan.color }" />
        <span>{{ selectedVlan.vlan_id }} · {{ selectedVlan.name }}</span>
      </div>
      <span v-else class="text-gray-400">—</span>
    </template>

    <template #option="{ option }">
      <div v-if="option.vlan" class="flex items-center gap-2">
        <div class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: option.vlan.color }" />
        <span class="font-medium">{{ option.vlan.vlan_id }}</span>
        <span class="text-xs text-gray-400">{{ option.vlan.name }}</span>
      </div>
      <span v-else class="text-gray-400">—</span>
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
  { label: '—', value: null, vlan: null },
  ...props.vlans.map(v => ({
    label: `${v.vlan_id} · ${v.name}`,
    value: v.vlan_id,
    vlan: v
  }))
])

const selectedOption = computed(() => {
  return options.value.find(o => o.value === props.modelValue) || options.value[0]
})

const selectedVlan = computed(() => {
  if (!props.modelValue) return null
  return props.vlans.find(v => v.vlan_id === props.modelValue)
})

function onSelect(option: any) {
  emit('update:modelValue', option?.value ?? null)
}
</script>
