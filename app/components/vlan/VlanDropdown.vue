<template>
  <USelectMenu
    v-model="value"
    :items="groupedOptions"
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
        :style="{ backgroundColor: colorMap[(item as { value: number }).value] || '#888' }"
      />
    </template>
    <template #item-trailing="{ item }">
      <span v-if="isUnconfiguredItem((item as { value: number }).value)">
        <UBadge v-if="overrideActive" color="info" variant="subtle" size="xs">
          {{ $t('vlans.willBeAddedBadge') }}
        </UBadge>
        <UIcon v-else name="i-heroicons-lock-closed" class="size-3.5 opacity-50" />
      </span>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  modelValue: number | null | undefined
  vlans: { vlan_id: number; name: string; color: string }[]
  configuredVlans?: number[]
  overrideActive?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const configuredSet = computed(() => new Set(props.configuredVlans || []))

function isUnconfiguredItem(vlanId: number): boolean {
  if (!props.configuredVlans || props.configuredVlans.length === 0 || vlanId === 0) return false
  return !configuredSet.value.has(vlanId)
}

const groupedOptions = computed(() => {
  const noneOption = { label: '— None —', value: 0 }

  if (!props.configuredVlans || props.configuredVlans.length === 0) {
    return [noneOption, ...props.vlans.map(v => ({
      label: `${v.vlan_id} · ${v.name}`,
      value: v.vlan_id
    }))]
  }

  const configured = props.vlans
    .filter(v => configuredSet.value.has(v.vlan_id))
    .map(v => ({ label: `${v.vlan_id} · ${v.name}`, value: v.vlan_id }))

  const other = props.vlans
    .filter(v => !configuredSet.value.has(v.vlan_id))
    .map(v => ({
      label: `${v.vlan_id} · ${v.name}`,
      value: v.vlan_id,
      disabled: !props.overrideActive
    }))

  const groups: any[] = [noneOption]

  if (configured.length > 0) {
    groups.push({ label: t('vlans.group.configured'), type: 'label' })
    groups.push(...configured)
  }

  if (other.length > 0) {
    groups.push({ label: props.overrideActive ? t('vlans.willBeAdded') : t('vlans.group.otherSite'), type: 'label' })
    groups.push(...other)
  }

  return groups
})

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
    return groupedOptions.value.find(o => o.value === props.modelValue) || groupedOptions.value[0]
  },
  set(val: { label: string; value: number } | undefined) {
    emit('update:modelValue', val?.value ? val.value : null)
  }
})
</script>
