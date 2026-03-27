<template>
  <USelectMenu
    :search-input="false"
    v-model="selected"
    :items="options"
    value-key="value"
    multiple
    placeholder="— Select VLANs —"
    class="w-full"
    @update:model-value="onSelect"
  >
    <template #label>
      <div v-if="modelValue.length" class="flex flex-wrap items-center gap-1">
        <span
          v-for="vid in modelValue"
          :key="vid"
          class="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-700"
        >
          <div class="h-2 w-2 rounded" :style="{ backgroundColor: getColor(vid) }" />
          {{ vid }}
        </span>
      </div>
      <span v-else class="text-gray-400">— Select VLANs —</span>
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
