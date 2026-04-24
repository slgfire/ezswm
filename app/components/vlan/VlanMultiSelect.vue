<template>
  <USelectMenu
    v-model="selected"
    :items="groupedOptions"
    value-key="value"
    multiple
    placeholder="Select VLANs..."
    class="w-full"
    :ui="{ item: 'items-center' }"
    @update:model-value="onSelect"
  >
    <!-- @vue-ignore -->
    <template #label>
      <div v-if="modelValue.length" class="flex flex-wrap items-center gap-1">
        <span
          v-for="vid in modelValue"
          :key="vid"
          class="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800"
        >
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: getColor(vid) }" />
          {{ vid }}
          <UBadge v-if="isUnconfiguredItem(vid)" color="info" variant="subtle" size="xs">
            {{ $t('vlans.willBeAddedBadge') }}
          </UBadge>
          <UBadge v-if="isUnconfiguredRemote(vid)" color="warning" variant="subtle" size="xs">
            {{ $t('vlans.willBeAddedRemoteBadge') }}
          </UBadge>
        </span>
      </div>
      <span v-else class="text-dimmed">Select VLANs...</span>
    </template>
    <template #item-leading="{ item }">
      <span
        class="size-3 shrink-0 rounded-full"
        :style="{ backgroundColor: colorMap[(item as { value: number }).value] || '#888' }"
      />
    </template>
    <template #item-trailing="{ item }">
      <span class="inline-flex gap-1">
        <UBadge v-if="isUnconfiguredItem((item as { value: number }).value)" color="info" variant="subtle" size="xs">
          {{ $t('vlans.willBeAddedBadge') }}
        </UBadge>
        <UBadge v-if="isUnconfiguredRemote((item as { value: number }).value)" color="warning" variant="subtle" size="xs">
          {{ $t('vlans.willBeAddedRemoteBadge') }}
        </UBadge>
      </span>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  modelValue: number[]
  vlans: { vlan_id: number; name: string; color: string }[]
  configuredVlans?: number[]
  remoteConfiguredVlans?: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const configuredSet = computed(() => new Set(props.configuredVlans || []))

const remoteConfiguredSet = computed(() => new Set(props.remoteConfiguredVlans || []))

function isUnconfiguredItem(vlanId: number): boolean {
  if (!props.configuredVlans) return false
  return !configuredSet.value.has(vlanId)
}

function isUnconfiguredRemote(vlanId: number): boolean {
  if (!props.remoteConfiguredVlans) return false
  return !remoteConfiguredSet.value.has(vlanId)
}

const groupedOptions = computed(() => {
  if (!props.configuredVlans) {
    return props.vlans.map(v => ({
      label: `${v.vlan_id} · ${v.name}`,
      value: v.vlan_id
    }))
  }

  const configured = props.vlans
    .filter(v => configuredSet.value.has(v.vlan_id))
    .map(v => ({ label: `${v.vlan_id} · ${v.name}`, value: v.vlan_id }))

  const other = props.vlans
    .filter(v => !configuredSet.value.has(v.vlan_id))
    .map(v => ({
      label: `${v.vlan_id} · ${v.name}`,
      value: v.vlan_id
    }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups: any[] = []

  if (configured.length > 0) {
    groups.push({ label: t('vlans.group.configured'), type: 'label' })
    groups.push(...configured)
  }

  if (other.length > 0) {
    groups.push({ label: t('vlans.group.otherSite'), type: 'label' })
    groups.push(...other)
  }

  return groups
})

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

function onSelect(values: number[] | unknown) {
  const ids = Array.isArray(values) ? values : []
  selected.value = ids
  emit('update:modelValue', ids)
}
</script>
