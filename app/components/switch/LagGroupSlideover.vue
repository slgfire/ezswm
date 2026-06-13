<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEdit ? $t('lag.edit') : $t('lag.create')"
    :description="isEdit ? $t('lag.editDescription') : $t('lag.createDescription')"
  >
    <template #body>
      <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('lag.name')" name="name" required>
          <UInput v-model="form.name" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.description')" name="description">
          <UTextarea v-model="form.description" :rows="2" class="w-full" />
        </UFormField>

        <UFormField :label="$t('lag.ports')" name="ports">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="portId in form.port_ids"
              :key="portId"
              color="info"
              variant="soft"
              size="sm"
              class="cursor-pointer"
              @click="removePort(portId)"
            >
              {{ getPortLabel(portId) }}
              <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
            </UBadge>
            <span v-if="form.port_ids.length === 0" class="text-sm text-gray-400">
              {{ $t('lag.noPortsSelected') }}
            </span>
          </div>
        </UFormField>

        <USeparator />

        <!-- Remote connection type -->
        <UFormField :label="$t('lag.remoteDevice')">
          <div class="mb-2 flex items-center gap-1">
            <button
              v-for="mode in remoteConnectionModes"
              :key="mode.value"
              type="button"
              class="rounded border px-2.5 py-1 text-xs font-medium transition-colors"
              :class="remoteMode === mode.value
                ? 'border-primary-500/50 bg-primary-500/20 text-primary-400'
                : 'border-neutral-300 bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-300'"
              @click="onRemoteModeChange(mode.value)"
            >{{ mode.label }}</button>
          </div>

          <USelectMenu
            v-if="remoteMode === 'switch'"
            :search-input="false"
            :model-value="selectedSwitchOption"
            :items="switchOptions"
            by="value"
            class="w-full"
            @update:model-value="onSwitchSelect"
          >
            <template #item-trailing="{ item }">
              <UBadge v-if="getMissingRemoteVlans((item as { value: string }).value).length" color="warning" variant="subtle" size="xs">
                {{ $t('vlans.missingCount', { count: getMissingRemoteVlans((item as { value: string }).value).length }) }}
              </UBadge>
            </template>
          </USelectMenu>

          <div v-if="remoteMode === 'switch' && selectedRemoteSwitchId && remoteSwitchMissingVlans.length > 0" class="mt-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-400">
            <UIcon name="i-heroicons-information-circle" class="size-3.5 inline-block mr-1" />
            {{ $t('lag.remoteSwitchWillAdd', { vlans: remoteSwitchMissingVlans.join(', ') }) }}
          </div>

          <UInput
            v-if="remoteMode === 'freetext'"
            v-model="form.remote_device"
            :placeholder="$t('lag.remoteDevicePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <!-- Existing remote LAG warning -->
        <div v-if="existingRemoteLag" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          {{ $t('lag.existingRemoteLag', { name: existingRemoteLag.name, switch: form.remote_device }) }}
        </div>

        <!-- Remote port LAG conflict (ports in a different LAG on remote switch) -->
        <div v-if="remotePortLagConflicts.length" class="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          <div v-for="c in remotePortLagConflicts" :key="c.portId" class="mt-1">
            {{ c.portLabel }} → {{ $t('lag.portInRemoteLag', { lag: c.lagName }) }}
          </div>
        </div>

        <!-- Port mapping table -->
        <div v-if="showPortMapping && form.port_ids.length > 0" class="rounded-lg border border-default bg-default/50 p-3">
          <div class="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            {{ $t('lag.portMapping') }}
          </div>
          <div class="space-y-2">
            <div
              v-for="portId in form.port_ids"
              :key="portId"
              class="space-y-1"
            >
              <div class="flex items-center gap-2">
                <span class="w-24 shrink-0 truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                  {{ getPortLabel(portId) }}
                </span>
                <span class="text-xs text-gray-400">→</span>

                <USelectMenu
                  v-if="remoteMode === 'switch' && selectedRemoteSwitchId"
                  :search-input="false"
                  :model-value="getRemotePortOption(portId)"
                  :items="remotePortOptions"
                  by="value"
                  placeholder="Select port..."
                  class="w-full"
                  @update:model-value="(val: { label: string; value: string; conflict: string } | undefined) => setRemotePort(portId, val)"
                />
                <UInput
                  v-else-if="remoteMode === 'freetext'"
                  :model-value="portMapping[portId]?.remotePortLabel || ''"
                  placeholder="e.g. Gi1/0/1"
                  class="w-full"
                  @update:model-value="(val: string) => setRemotePortFreetext(portId, val)"
                />
              </div>
              <!-- Connection conflict warning -->
              <div v-if="getPortConflict(portId)" class="ml-[6.5rem] rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400">
                {{ getPortConflict(portId) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Global conflict warning -->
        <div v-if="hasConnectionConflicts" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          {{ $t('lag.conflictWarning') }}
        </div>

        <USeparator />

        <!-- VLAN configuration for LAG ports -->
        <div class="space-y-3">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {{ $t('lag.vlanSection') }}
          </h4>

          <UFormField :label="$t('switches.ports.portMode')">
            <USelect v-model="vlanForm.port_mode" :items="vlanPortModeOptions" class="w-full" />
          </UFormField>

          <template v-if="vlanForm.port_mode === 'access'">
            <UFormField :label="$t('switches.ports.accessVlan')">
              <VlanDropdown v-if="allVlans.length" v-model="vlanForm.access_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="remoteConfiguredVlansList" />
            </UFormField>
          </template>

          <template v-if="vlanForm.port_mode === 'trunk'">
            <UFormField :label="$t('switches.ports.nativeVlan')">
              <VlanDropdown v-if="allVlans.length" v-model="vlanForm.native_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="remoteConfiguredVlansList" />
            </UFormField>
            <UFormField :label="$t('switches.ports.taggedVlans')">
              <VlanMultiSelect v-if="allVlans.length" v-model="vlanForm.tagged_vlans" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="remoteConfiguredVlansList" />
            </UFormField>
          </template>

        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="saving" :disabled="remotePortLagConflicts.length > 0" icon="i-heroicons-check" @click="onSubmit">
          {{ isEdit ? $t('common.save') : $t('lag.create') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { LAGGroup } from '~~/types/lagGroup'
import type { Port } from '~~/types/port'
import { resolvePortLabel } from '~/utils/ports'

const props = defineProps<{
  switchId: string
  siteId?: string
  ports: Port[]
  existingLags: LAGGroup[]
  configuredVlans?: number[]
}>()

// Site context disambiguates per-site-unique switch slugs on local-switch calls.
const localQuery = computed(() => (props.siteId ? { siteId: props.siteId } : undefined))

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()

const isOpen = ref(false)
const saving = ref(false)
const editingLag = ref<LAGGroup | null>(null)
const isEdit = computed(() => !!editingLag.value)

const form = reactive({
  name: '',
  description: '',
  port_ids: [] as string[],
  remote_device: '',
  remote_device_id: '' as string | undefined,
})

// VLAN configuration composable
const { allVlans, vlanForm, vlanPortModeOptions, fetchVlans } = useLagVlanConfig()

// Remote connection composable
const {
  remoteMode,
  allSwitches,
  selectedRemoteSwitchId,
  remoteLags,
  portMapping,
  switchOptions,
  selectedSwitchOption,
  existingRemoteLag,
  remotePortOptions,
  remotePortLagConflicts,
  hasConnectionConflicts,
  remoteSwitchMissingVlans,
  remoteConfiguredVlansList,
  showPortMapping,
  onRemoteModeChange,
  onSwitchSelect,
  fetchSwitches,
  fetchRemoteLags,
  initPortMapping,
  getRemotePortOption,
  setRemotePort,
  setRemotePortFreetext,
  getPortConflict,
  getMissingRemoteVlans
} = useRemoteConnection(
  toRef(() => props.switchId),
  toRef(() => props.ports),
  toRef(form, 'port_ids'),
  toRef(form, 'remote_device'),
  toRef(form, 'remote_device_id'),
  vlanForm
)

const remoteConnectionModes = computed(() => [
  { label: t('common.none'), value: 'none' as const },
  { label: 'Switch', value: 'switch' as const },
  { label: t('switches.ports.freetext'), value: 'freetext' as const },
])

function getPortLabel(portId: string): string {
  return resolvePortLabel(props.ports, portId)
}

function removePort(portId: string) {
  form.port_ids = form.port_ids.filter(id => id !== portId)
  delete portMapping[portId]
}

function validate(state: { name?: string; port_ids: string[] }) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('lag.validation.nameRequired') })
  }
  if (state.port_ids.length < 2) {
    errors.push({ name: 'ports', message: t('lag.validation.minPorts') })
  }
  for (const portId of state.port_ids) {
    const conflict = props.existingLags.find(
      lag => lag.id !== editingLag.value?.id && lag.port_ids.includes(portId)
    )
    if (conflict) {
      errors.push({
        name: 'ports',
        message: t('lag.validation.portInLag', { port: getPortLabel(portId), lag: conflict.name })
      })
      break
    }
  }
  return errors
}

const { create, update } = useLagGroups(props.switchId, toRef(() => props.siteId ?? ''))

// --- onSubmit stage functions ---

async function createOrUpdateLocalLag(): Promise<void> {
  const body = {
    name: form.name.trim(),
    port_ids: [...form.port_ids],
    description: form.description.trim() || undefined,
    remote_device: remoteMode.value !== 'none' ? (form.remote_device.trim() || undefined) : undefined,
    remote_device_id: remoteMode.value === 'switch' ? (selectedRemoteSwitchId.value || undefined) : undefined,
  }
  if (isEdit.value && editingLag.value) {
    await update(editingLag.value.id, body)
  } else {
    await create(body)
  }
}

async function updateLocalPortConnections(): Promise<void> {
  if (remoteMode.value !== 'none' && form.remote_device.trim()) {
    for (const portId of form.port_ids) {
      const mapping = portMapping[portId]
      const portBody: Record<string, string | null> = {
        connected_device: form.remote_device.trim(),
        connected_device_id: remoteMode.value === 'switch' ? (selectedRemoteSwitchId.value || null) : null,
        connected_port_id: mapping?.remotePortId || null,
        connected_port: mapping?.remotePortLabel || null,
      }
      try {
        await $fetch(`/api/switches/${props.switchId}/ports/${portId}`, { method: 'PUT', body: portBody, query: localQuery.value })
      } catch { /* best-effort */ }
    }
  } else if (remoteMode.value === 'none') {
    for (const portId of form.port_ids) {
      try {
        await $fetch(`/api/switches/${props.switchId}/ports/${portId}`, {
          method: 'PUT',
          body: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null },
          query: localQuery.value
        })
      } catch { /* best-effort */ }
    }
  }
}

async function applyVlanConfig(): Promise<void> {
  const vlanUpdates: Record<string, unknown> = {
    port_mode: vlanForm.port_mode
  }
  if (vlanForm.port_mode === 'access') {
    if (vlanForm.access_vlan) vlanUpdates.access_vlan = vlanForm.access_vlan
    vlanUpdates.native_vlan = null
    vlanUpdates.tagged_vlans = []
  } else {
    vlanUpdates.access_vlan = null
    if (vlanForm.native_vlan) vlanUpdates.native_vlan = vlanForm.native_vlan
    if (vlanForm.tagged_vlans.length) vlanUpdates.tagged_vlans = [...vlanForm.tagged_vlans]
  }
  // Apply to local LAG ports
  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
      body: { port_ids: [...form.port_ids], updates: vlanUpdates },
      query: localQuery.value
    })
    toast.add({ title: t('lag.vlanApplied', { count: form.port_ids.length }), color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('lag.vlanApplyFailed'), color: 'error' })
  }
  // Apply same VLAN config to remote LAG member ports
  if (remoteMode.value === 'switch' && selectedRemoteSwitchId.value) {
    let remotePortIds = form.port_ids
      .map(pid => portMapping[pid]?.remotePortId)
      .filter(Boolean) as string[]
    // Fallback: if no port mapping, use mirror LAG's port_ids directly
    if (remotePortIds.length === 0 && existingRemoteLag.value) {
      remotePortIds = [...existingRemoteLag.value.port_ids]
    }
    if (remotePortIds.length > 0) {
      try {
        await $fetch(`/api/switches/${selectedRemoteSwitchId.value}/ports/bulk`, {
          method: 'PUT',
          body: { port_ids: remotePortIds, updates: vlanUpdates }
        })
        const remoteSw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
        toast.add({ title: t('lag.vlanAppliedRemote', { count: remotePortIds.length, switch: remoteSw?.name || '' }), color: 'success' })
      } catch (e: unknown) {
        const err = e as { data?: { message?: string } }
        toast.add({ title: err?.data?.message || t('lag.vlanApplyFailed'), color: 'error' })
      }
    }
  }
}

async function syncRemoteLag() {
  const remoteSwId = selectedRemoteSwitchId.value
  if (!remoteSwId) return

  const remotePortIds = form.port_ids
    .map(pid => portMapping[pid]?.remotePortId)
    .filter(Boolean) as string[]

  // A mirror LAG can only be created when at least two member ports are mapped
  // to concrete remote ports. Warn instead of silently skipping it, otherwise
  // the user sees the remote ports/VLANs configured but no LAG group and has no
  // idea why.
  if (remotePortIds.length < 2) {
    toast.add({
      title: t('lag.mirrorNotCreated'),
      description: t('lag.mirrorNeedsPortMapping'),
      color: 'warning'
    })
    return
  }

  const localSw = allSwitches.value.find(s => s.id === props.switchId)
  const localSwName = localSw?.name || props.switchId

  const mirrorBody = {
    name: form.name.trim(),
    port_ids: remotePortIds,
    description: form.description.trim() || undefined,
    remote_device: localSwName,
    remote_device_id: props.switchId,
  }

  if (existingRemoteLag.value) {
    try {
      await $fetch(`/api/switches/${remoteSwId}/lag-groups/${existingRemoteLag.value.id}`, { method: 'DELETE' })
    } catch { /* best-effort */ }
  }

  try {
    await $fetch(`/api/switches/${remoteSwId}/lag-groups`, { method: 'POST', body: mirrorBody })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: `Mirror LAG: ${err?.data?.message || 'Failed'}`, color: 'warning' })
    return
  }

  for (const localPortId of form.port_ids) {
    const mapping = portMapping[localPortId]
    if (!mapping?.remotePortId) continue
    const localPort = props.ports.find(p => p.id === localPortId)
    const localPortLabel = localPort ? resolvePortLabel(props.ports, localPortId) : ''
    try {
      await $fetch(`/api/switches/${remoteSwId}/ports/${mapping.remotePortId}`, {
        method: 'PUT',
        body: {
          connected_device: localSwName,
          connected_device_id: props.switchId,
          connected_port_id: localPortId,
          connected_port: localPortLabel || null,
        }
      })
    } catch { /* best-effort */ }
  }
}

async function onSubmit() {
  const errors = validate(form)
  if (errors.length > 0) return

  if (hasConnectionConflicts.value) {
    if (!window.confirm(t('lag.conflictConfirm'))) return
  }

  if (existingRemoteLag.value && !isEdit.value) {
    if (!window.confirm(t('lag.replaceRemoteLag', { name: existingRemoteLag.value.name, switch: form.remote_device }))) return
  }

  saving.value = true
  try {
    await createOrUpdateLocalLag()
    await updateLocalPortConnections()
    if (remoteMode.value === 'switch' && selectedRemoteSwitchId.value) {
      await syncRemoteLag()
    }
    toast.add({
      title: isEdit.value ? t('lag.messages.updated') : t('lag.messages.created'),
      color: 'success'
    })
    await applyVlanConfig()
    isOpen.value = false
    emit('saved')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openCreate(portIds: string[]) {
  editingLag.value = null
  form.name = ''
  form.description = ''
  form.port_ids = [...portIds]
  form.remote_device = ''
  form.remote_device_id = undefined
  remoteMode.value = 'none'
  selectedRemoteSwitchId.value = ''
  remoteLags.value = []
  for (const key of Object.keys(portMapping)) delete portMapping[key]
  vlanForm.port_mode = 'access'
  vlanForm.access_vlan = null
  vlanForm.native_vlan = null
  vlanForm.tagged_vlans = []
  isOpen.value = true
  fetchSwitches()
  fetchVlans()
}

async function openEdit(lag: LAGGroup) {
  editingLag.value = lag
  form.name = lag.name
  form.description = lag.description || ''
  form.port_ids = [...lag.port_ids]
  form.remote_device = lag.remote_device || ''
  form.remote_device_id = lag.remote_device_id

  if (lag.remote_device_id) {
    remoteMode.value = 'switch'
    selectedRemoteSwitchId.value = lag.remote_device_id
  } else if (lag.remote_device) {
    remoteMode.value = 'freetext'
  } else {
    remoteMode.value = 'none'
  }

  for (const key of Object.keys(portMapping)) delete portMapping[key]
  initPortMapping()

  const firstPort = props.ports.find(p => lag.port_ids.includes(p.id))
  if (firstPort) {
    vlanForm.port_mode = firstPort.port_mode || 'access'
    vlanForm.access_vlan = firstPort.access_vlan || null
    vlanForm.native_vlan = firstPort.native_vlan || null
    vlanForm.tagged_vlans = [...(firstPort.tagged_vlans || [])]
  } else {
    vlanForm.port_mode = 'access'
    vlanForm.access_vlan = null
    vlanForm.native_vlan = null
    vlanForm.tagged_vlans = []
  }

  isOpen.value = true
  await fetchSwitches()
  fetchVlans()
  if (lag.remote_device_id) {
    await fetchRemoteLags(lag.remote_device_id)
  }
}

defineExpose({ openCreate, openEdit })
</script>
