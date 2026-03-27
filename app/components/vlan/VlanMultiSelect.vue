<template>
  <USelectMenu
    :search-input="false"
    v-model="selected"
    :items="options"
    value-key="value"
    multiple
    placeholder="Select VLANs..."
    class="w-full"
    :ui="{ item: 'items-center' }"
    @update:model-value="onSelect"
  >
    <template #label>
      <div v-if="modelValue.length" class="flex flex-wrap items-center gap-1">
        <span
          v-for="vid in modelValue"
          :key="vid"
          class="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800"
        >
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: getColor(vid) }" />
          {{ vid }}
        </span>
      </div>
      <span v-else class="text-dimmed">Select VLANs...</span>
    </template>
    <template #item-leading="{ item }">
      <span
        class="my-auto size-3 shrink-0 rounded-full"
        :style="{ backgroundColor: colorMap[(item as any).value] || '#888' }"
      />
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
    value: v.vlan_id
  }))
)

const colorMap = computed(() => {
  const map: Record<number, string> = {}
  for (const v of props.vlans) map[v.vlan_id] = v.color
  return map
})

const selected = ref<number[]>([...props.modelValue])

watch(() => props.modelValue, (val) => {
  selected.value = [...val]
})

function getColor(vlanId: number): string {
  return props.vlans.find(v => v.vlan_id === vlanId)?.color || '#888'
}

function onSelect(values: any) {
  const ids = Array.isArray(values) ? values : []
  selected.value = ids
  emit('update:modelValue', ids)
}
</script>
