<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ $t('vlans.remove.inUseTitle', { id: vlanId, count: affectedPorts.length }) }}
      </h3>
    </template>

    <div class="p-4 space-y-3">
      <div
        v-for="entry in affectedPorts"
        :key="`${entry.port_id}-${entry.field}`"
        class="flex items-center gap-3 rounded-md border border-default p-3"
      >
        <div class="flex-1 min-w-0">
          <span class="font-mono text-sm">{{ entry.port_label }}</span>
          <span class="ml-2 text-xs text-dimmed">{{ entry.field }}</span>
        </div>

        <div v-if="entry.field === 'tagged_vlans'" class="text-xs text-dimmed shrink-0">
          {{ $t('vlans.remove.taggedAuto') }}
        </div>

        <div v-else class="shrink-0">
          <USelectMenu
            v-model="decisions[`${entry.port_id}:${entry.field}`]"
            :items="replacementOptions"
            size="sm"
            class="w-48"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton color="error" @click="confirm">
          {{ $t('vlans.remove.confirmButton', { count: affectedPorts.length }) }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  vlanId: number
  affectedPorts: Array<{ port_id: string; port_label: string; field: string }>
  requiresDecision: Array<{ port_id: string; field: string }>
  removableAutomatically: Array<{ port_id: string; field: string }>
  configuredVlans: number[]
  allVlans: Array<{ vlan_id: number; name: string }>
  currentUpdatedAt: string
}>()

const emit = defineEmits<{
  'confirm': [cleanup: Array<{ port_id: string; field: string; new_value?: number | null; action?: string }>, expectedUpdatedAt: string]
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const decisions = reactive<Record<string, { label: string; value: number | null }>>({})

// Initialize decisions for requires_decision entries
watch(() => props.requiresDecision, (entries) => {
  for (const entry of entries) {
    const key = `${entry.port_id}:${entry.field}`
    if (!decisions[key]) {
      decisions[key] = { label: t('vlans.remove.setToNone'), value: null }
    }
  }
}, { immediate: true })

const replacementOptions = computed(() => {
  const postRemove = props.configuredVlans.filter(v => v !== props.vlanId)
  const options: Array<{ label: string; value: number | null }> = [
    { label: t('vlans.remove.setToNone'), value: null }
  ]
  for (const vid of postRemove) {
    const vlan = props.allVlans.find(v => v.vlan_id === vid)
    if (vlan) {
      options.push({ label: `${vid} · ${vlan.name}`, value: vid })
    }
  }
  return options
})

function confirm() {
  const cleanup: Array<{ port_id: string; field: string; new_value?: number | null; action?: string }> = []

  for (const entry of props.removableAutomatically) {
    cleanup.push({ port_id: entry.port_id, field: entry.field, action: 'auto_remove' })
  }

  for (const entry of props.requiresDecision) {
    const key = `${entry.port_id}:${entry.field}`
    const decision = decisions[key]
    cleanup.push({
      port_id: entry.port_id,
      field: entry.field,
      new_value: decision?.value ?? null
    })
  }

  emit('confirm', cleanup, props.currentUpdatedAt)
  isOpen.value = false
}
</script>
