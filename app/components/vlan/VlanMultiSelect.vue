<template>
  <USelectMenu
    :model-value="selectedOptions"
    :items="options"
    multiple
    :searchable="vlans.length > 5"
    searchable-placeholder="Search VLAN..."
    option-attribute="label"
    by="value"
    :close-on-select="false"
    @update:model-value="onSelect"
  >
    <template #label>
      <div v-if="modelValue.length" class="flex flex-wrap items-center gap-1">
        <span
          v-for="vid in modelValue"
          :key="vid"
          class="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-700"
        >
          <div class="h-2 w-2 rounded" :style="{ backgroundColor: getColor(vid) }" />
          {{ vid }}
        </span>
      </div>
      <span v-else class="text-gray-400">—</span>
    </template>

    <template #option="{ option }">
      <div class="flex items-center gap-2">
        <div class="h-3 w-3 flex-shrink-0 rounded" :style="{ backgroundColor: option.vlan?.color || '#888' }" />
        <span class="font-medium">{{ option.vlan?.vlan_id }}</span>
        <span class="text-xs text-gray-400">{{ option.vlan?.name }}</span>
      </div>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: number[]
  vlans: any[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const options = computed(() =>
  props.vlans.map(v => ({
    label: `${v.vlan_id} · ${v.name}`,
    value: v.vlan_id,
    vlan: v
  }))
)

const selectedOptions = computed(() =>
  options.value.filter(o => props.modelValue.includes(o.value))
)

function getColor(vlanId: number): string {
  return props.vlans.find(v => v.vlan_id === vlanId)?.color || '#888'
}

function onSelect(selected: any[]) {
  emit('update:modelValue', selected.map(s => s.value))
}
</script>
