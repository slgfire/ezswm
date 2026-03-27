<template>
  <USelectMenu
    :search-input="false"
    v-model="selected"
    :items="options"
    value-key="value"
    placeholder="Select VLAN..."
    class="w-full"
    @update:model-value="onSelect"
  >
    <template v-if="selectedVlan" #leading>
      <span
        class="inline-block h-3 w-3 shrink-0 rounded-full"
        :style="{ backgroundColor: selectedVlan.color }"
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
    label: `VLAN ${v.vlan_id} · ${v.name}`,
    value: v.vlan_id
  }))
)

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
