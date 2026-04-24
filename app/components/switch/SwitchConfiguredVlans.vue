<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-gray-400">{{ configuredVlanDetails.length }} VLANs</span>
      <UButton
        size="xs"
        variant="soft"
        icon="i-heroicons-plus"
        :label="$t('vlans.addToSwitchAction')"
        @click="showAddDialog = !showAddDialog"
      />
    </div>

    <div class="space-y-1">
      <div v-if="configuredVlanDetails.length === 0" class="text-sm text-dimmed">
        {{ $t('common.noResults') }}
      </div>

      <div
        v-for="vlan in configuredVlanDetails"
        :key="vlan.vlan_id"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-elevated"
      >
        <span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: vlan.color || '#888' }" />
        <span class="flex-1 text-sm">{{ vlan.vlan_id }} · {{ vlan.name || 'Unknown VLAN' }}</span>
        <UButton
          size="xs"
          variant="ghost"
          color="error"
          icon="i-heroicons-x-mark"
          @click="removeVlan(vlan.vlan_id)"
        />
      </div>
    </div>

    <!-- Add VLANs inline (shown when + button clicked) -->
    <div v-if="showAddDialog" class="mt-3 rounded-md border border-default p-3">
      <p class="text-xs font-medium text-dimmed mb-2">{{ $t('vlans.group.otherSite') }}</p>
      <div v-if="availableToAdd.length === 0" class="text-xs text-dimmed">
        {{ $t('common.noResults') }}
      </div>
      <div v-else class="space-y-1 max-h-48 overflow-y-auto">
        <div
          v-for="vlan in availableToAdd"
          :key="vlan.vlan_id"
          class="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-elevated"
          @click="addVlan(vlan.vlan_id)"
        >
          <span class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: vlan.color }" />
          <span class="text-sm">{{ vlan.vlan_id }} · {{ vlan.name }}</span>
          <UIcon name="i-heroicons-plus" class="ml-auto h-3.5 w-3.5 text-dimmed" />
        </div>
      </div>
    </div>

    <SwitchVlanRemoveConfirmDialog
      v-if="removeDialog.open"
      v-model:open="removeDialog.open"
      :vlan-id="removeDialog.vlanId"
      :affected-ports="removeDialog.affectedPorts"
      :requires-decision="removeDialog.requiresDecision"
      :removable-automatically="removeDialog.removableAutomatically"
      :configured-vlans="configuredVlans"
      :all-vlans="allVlans"
      :current-updated-at="removeDialog.currentUpdatedAt"
      @confirm="confirmRemove"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
  switchId: string
  switchName: string
  configuredVlans: number[]
  allVlans: Array<{ vlan_id: number; name: string; color: string }>
  updatedAt: string
}>()

const emit = defineEmits<{
  'updated': []
}>()

const expanded = ref(true)
const showAddDialog = ref(false)

const configuredVlanDetails = computed(() => {
  return props.configuredVlans.map(vid => {
    const vlan = props.allVlans.find(v => v.vlan_id === vid)
    return {
      vlan_id: vid,
      name: vlan?.name || '',
      color: vlan?.color || '#888'
    }
  })
})

const availableToAdd = computed(() => {
  const configuredSet = new Set(props.configuredVlans)
  return props.allVlans.filter(v => !configuredSet.has(v.vlan_id))
})

const removeDialog = reactive({
  open: false,
  vlanId: 0,
  affectedPorts: [] as Array<{ port_id: string; port_label: string; field: string }>,
  requiresDecision: [] as Array<{ port_id: string; field: string }>,
  removableAutomatically: [] as Array<{ port_id: string; field: string }>,
  currentUpdatedAt: ''
})

async function addVlan(vlanId: number) {
  try {
    await $fetch(`/api/switches/${props.switchId}/configured-vlans`, {
      method: 'PUT',
      body: {
        action: 'add',
        vlan_ids: [vlanId],
        expected_updated_at: props.updatedAt
      }
    })
    toast.add({ title: t('vlans.addedToSwitch', { id: vlanId }) })
    showAddDialog.value = false
    emit('updated')
  } catch (err: any) {
    toast.add({ title: err.statusMessage || 'Error', color: 'error' })
  }
}

async function removeVlan(vlanId: number) {
  try {
    await $fetch(`/api/switches/${props.switchId}/configured-vlans`, {
      method: 'PUT',
      body: {
        action: 'remove',
        vlan_id: vlanId,
        expected_updated_at: props.updatedAt
      }
    })
    toast.add({ title: t('vlans.remove.success', { id: vlanId, count: 0 }) })
    emit('updated')
  } catch (err: any) {
    if (err.statusCode === 409 && err.data?.affected_ports) {
      removeDialog.vlanId = vlanId
      removeDialog.affectedPorts = err.data.affected_ports
      removeDialog.requiresDecision = err.data.requires_decision || []
      removeDialog.removableAutomatically = err.data.removable_automatically || []
      removeDialog.currentUpdatedAt = err.data.current_updated_at
      removeDialog.open = true
    } else {
      toast.add({ title: err.statusMessage || 'Error', color: 'error' })
    }
  }
}

async function confirmRemove(cleanup: any[], expectedUpdatedAt: string) {
  try {
    const result = await $fetch(`/api/switches/${props.switchId}/configured-vlans`, {
      method: 'PUT',
      body: {
        action: 'remove_confirmed',
        vlan_id: removeDialog.vlanId,
        expected_updated_at: expectedUpdatedAt,
        port_cleanup: cleanup
      }
    }) as any
    toast.add({ title: t('vlans.remove.success', { id: removeDialog.vlanId, count: result?.ports_updated || 0 }) })
    emit('updated')
  } catch (err: any) {
    if (err.statusCode === 409) {
      toast.add({ title: 'Switch was modified. Please try again.', color: 'warning' })
      emit('updated')
    } else {
      toast.add({ title: err.statusMessage || 'Error', color: 'error' })
    }
  }
}
</script>
