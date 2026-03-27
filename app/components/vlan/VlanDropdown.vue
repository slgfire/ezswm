<template>
  <USelectMenu
    :search-input="false"
    v-model="value"
    :items="options"
    placeholder="Select VLAN..."
    class="w-full"
  >
    <template #leading="{ modelValue, ui }">
      <UChip
        v-if="modelValue?.chip"
        v-bind="modelValue.chip"
        inset
        standalone
        :size="ui.itemLeadingChipSize()"
        :class="ui.itemLeadingChip()"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import type { SelectMenuItem } from '@nuxt/ui'

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
    value: v.vlan_id,
    chip: { color: v.color, style: { backgroundColor: v.color } }
  } satisfies SelectMenuItem & { value: number }))
)

const value = computed({
  get() {
    return options.value.find(o => o.value === props.modelValue) || undefined
  },
  set(val: any) {
    emit('update:modelValue', val?.value ?? null)
  }
})
</script>
