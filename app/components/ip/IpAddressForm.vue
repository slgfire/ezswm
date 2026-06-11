<template>
  <USlideover v-model:open="openModel">
    <template #title>
      <div v-if="editTarget" class="flex items-center gap-2">
        <code class="font-mono text-sm">{{ editTarget.ip_address }}</code>
        <span v-if="editTarget.hostname" class="text-sm text-gray-400">{{ editTarget.hostname }}</span>
      </div>
      <span v-else>{{ $t('ipAddresses.add') }}</span>
    </template>

    <template #actions>
      <div v-if="editTarget" class="flex items-center gap-1">
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="emit('delete')" />
      </div>
    </template>

    <template #body>
      <div v-if="error" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
        {{ error }}
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField :label="$t('ipAddresses.fields.ipAddress')" required>
          <UInput v-model="form.ip_address" placeholder="10.0.1.10" required :color="error ? 'error' : undefined" class="w-full" />
        </UFormField>

        <!-- Network: editable + auto-preselected (add); read-only (edit) -->
        <UFormField :label="$t('ipAddresses.fields.network')" required>
          <div v-if="editTarget" class="flex items-center gap-2 text-sm">
            <span class="font-medium text-gray-900 dark:text-white">{{ editTarget.network_name }}</span>
            <code class="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">{{ editTarget.network_subnet }}</code>
          </div>
          <template v-else>
            <USelect v-model="manualNetworkId" :items="networkOptions" :placeholder="$t('ipAddresses.fields.network')" class="w-full" />
            <p v-if="showNoMatchHint" class="mt-1 text-xs text-amber-600 dark:text-amber-400">{{ $t('ipAddresses.noNetworkMatch') }}</p>
          </template>
        </UFormField>

        <!-- VLAN derived from the selected network (read-only) -->
        <UFormField v-if="selectedVlan" :label="$t('ipAddresses.fields.vlan')">
          <div class="flex items-center gap-2 text-sm">
            <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ backgroundColor: selectedVlan.color }" />
            <span>VLAN {{ selectedVlan.vlan_id }} · {{ selectedVlan.name }}</span>
          </div>
        </UFormField>

        <UFormField :label="$t('ipAddresses.fields.hostname')">
          <UInput v-model="form.hostname" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('ipAddresses.fields.deviceType')">
            <USelect v-model="form.device_type" :items="deviceTypeOptions" placeholder="-" class="w-full" />
          </UFormField>
          <UFormField :label="$t('ipAddresses.fields.status')">
            <USelect v-model="form.status" :items="allocStatusOptions" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="$t('ipAddresses.fields.macAddress')">
          <UInput v-model="form.mac_address" placeholder="AA:BB:CC:DD:EE:FF" class="w-full" />
        </UFormField>
        <UFormField :label="$t('common.description')">
          <UInput v-model="form.description" class="w-full" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="emit('close')">{{ $t('common.cancel') }}</UButton>
        <UButton :loading="saving" :disabled="!effectiveNetworkId" @click="onSubmit">
          {{ editTarget ? $t('common.save') : $t('common.add') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { IPAllocation, IpAllocationEnriched, DeviceType, AllocationStatus } from '~~/types/ipAllocation'
import type { Network } from '~~/types/network'
import type { VLAN } from '~~/types/vlan'

interface FormState {
  ip_address: string
  hostname: string
  mac_address: string
  device_type: string
  status: string
  description: string
}

const props = defineProps<{
  open: boolean
  editTarget: IpAllocationEnriched | null
  networks: Network[]
  vlans: VLAN[]
  deviceTypeOptions: { label: string; value: string }[]
  allocStatusOptions: { label: string; value: string }[]
  error: string
  saving: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { networkId: string; body: Partial<IPAllocation> }]
  delete: []
  close: []
}>()

const openModel = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
})

function blankForm(): FormState {
  return { ip_address: '', hostname: '', mac_address: '', device_type: '', status: 'active', description: '' }
}

const form = ref<FormState>(blankForm())
const manualNetworkId = ref('')

const networkOptions = computed(() =>
  props.networks.map(n => ({ label: `${n.name} (${n.subnet})`, value: n.id }))
)

// Auto-derive the network from the typed IP (add mode only); the user can override.
const derivedNetwork = computed(() => {
  if (props.editTarget) return null
  return findNetworkForIP(form.value.ip_address.trim(), props.networks)
})
watch(derivedNetwork, (net) => {
  if (net) manualNetworkId.value = net.id
})

const effectiveNetworkId = computed(() =>
  props.editTarget ? props.editTarget.network_id : manualNetworkId.value
)

const selectedNetwork = computed(() =>
  props.networks.find(n => n.id === effectiveNetworkId.value) ?? null
)
const selectedVlan = computed(() => {
  const vlanId = selectedNetwork.value?.vlan_id
  return vlanId ? props.vlans.find(v => v.id === vlanId) ?? null : null
})

const showNoMatchHint = computed(() =>
  !props.editTarget &&
  isValidIPv4(form.value.ip_address.trim()) &&
  !derivedNetwork.value &&
  !manualNetworkId.value
)

watch(() => props.open, (open) => {
  if (!open) return
  if (props.editTarget) {
    const t = props.editTarget
    form.value = {
      ip_address: t.ip_address,
      hostname: t.hostname ?? '',
      mac_address: t.mac_address ?? '',
      device_type: t.device_type ?? '',
      status: t.status,
      description: t.description ?? ''
    }
    manualNetworkId.value = t.network_id
  } else {
    form.value = blankForm()
    manualNetworkId.value = ''
  }
})

function onSubmit() {
  if (!effectiveNetworkId.value) return
  const body: Partial<IPAllocation> = {
    ip_address: form.value.ip_address.trim(),
    hostname: form.value.hostname.trim() || undefined,
    mac_address: form.value.mac_address.trim() || undefined,
    device_type: (form.value.device_type || undefined) as DeviceType | undefined,
    description: form.value.description.trim() || undefined,
    status: form.value.status as AllocationStatus
  }
  emit('submit', { networkId: effectiveNetworkId.value, body })
}
</script>
