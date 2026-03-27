<template>
  <USelectMenu
    :search-input="false"
    v-model="selected"
    :items="options"
    value-key="value"
    placeholder="Select VLAN..."
    class="w-full"
    @update:model-value="onSelect"
  />
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

function onSelect(value: any) {
  selected.value = value
  emit('update:modelValue', value ?? null)
}
</script>
