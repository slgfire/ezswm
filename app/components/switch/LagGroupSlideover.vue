<template>
  <USlideover
    :open="isOpen"
    :title="isEdit ? $t('lag.edit') : $t('lag.create')"
    :description="isEdit ? $t('lag.editDescription') : $t('lag.createDescription')"
    @update:open="onOpenChange"
  >
    <template #body>
      <UForm ref="lagFormRef" :state="form" :validate="validate" :validate-on="['blur', 'change']" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('lag.name')" name="name" required>
          <UInput v-model="form.name" maxlength="100" class="w-full" />
        </UFormField>

         <UFormField v-if="!isDuplicate" :label="$t('lag.description')" name="description">
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
              class="gap-1"
            >
              {{ getPortLabel(portId) }}
              <button type="button" :aria-label="$t('lag.removePort', { port: getPortLabel(portId) })" @click="removePortFromSelection(portId)">
                <UIcon name="i-heroicons-x-mark" class="ml-0.5 h-3 w-3" />
              </button>
            </UBadge>
            <span v-if="form.port_ids.length === 0" class="text-sm text-gray-400">
              {{ $t('lag.noPortsSelected') }}
            </span>
          </div>
          <USelectMenu
            v-model:open="localPortMenuOpen"
            v-model="form.port_ids"
            multiple
            :search-input="{ placeholder: $t('lag.searchPorts') }"
            :items="availableLocalPortOptions"
             :placeholder="form.port_ids.length ? undefined : $t('switches.ports.selectPort')"
            by="value"
            value-key="value"
            class="mt-2 w-full"
             @update:model-value="onLocalPortsChange"
           >
              <template v-if="form.port_ids.length" #default>
                 <span v-if="form.port_ids.length">{{ selectedPortsTrigger(form.port_ids, $t, value => value) }}</span>
              </template>
           </USelectMenu>
        </UFormField>

        <USeparator />

         <!-- Remote connection type -->
         <UFormField v-if="!isDuplicate" :label="$t('lag.remoteDevice')">
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
         <div v-if="!isDuplicate && existingRemoteLag" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          {{ $t('lag.existingRemoteLag', { name: existingRemoteLag.name, switch: form.remote_device }) }}
        </div>

        <!-- Remote port LAG conflict (ports in a different LAG on remote switch) -->
         <div v-if="!isDuplicate && remotePortLagConflicts.length" class="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          <div v-for="c in remotePortLagConflicts" :key="c.portId" class="mt-1">
            {{ c.portLabel }} → {{ $t('lag.portInRemoteLag', { lag: c.lagName }) }}
          </div>
        </div>

        <!-- Port mapping table -->
         <div v-if="!isDuplicate && showPortMapping && form.port_ids.length > 0" class="rounded-lg border border-default bg-default/50 p-3">
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
                  :search-input="{ placeholder: $t('lag.searchPortPlaceholder') }"
                  :model-value="getRemotePortOption(portId)"
                  :items="availableRemotePortOptions(portId)"
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
         <div v-if="!isDuplicate && hasConnectionConflicts" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
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
        <UButton color="neutral" variant="ghost" @click="requestClose">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton v-if="isEdit" color="neutral" variant="outline" icon="i-heroicons-document-duplicate" @click="duplicateLag">
          {{ $t('lag.duplicate') }}
        </UButton>
         <UButton :loading="saving" :disabled="!isDuplicate && remotePortLagConflicts.length > 0" icon="i-heroicons-check" @click="lagFormRef?.submit()">
          {{ isEdit ? $t('common.save') : $t('lag.create') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { LAGGroup } from '~~/types/lagGroup'
import type { Port } from '~~/types/port'
import { suggestLagCopyName } from '~/utils/lagCopyName'
import { buildLagSaveRequest, executeLagSaveRequest, saveLagLocally, submitLagSequence } from '~/utils/lagSubmit'
import { resolvePortLabel } from '~/utils/ports'
import { buildLagPortOptions, removeLagPort } from '~/utils/lagPortOptions'
import { selectedPortsTrigger } from '~/utils/lagSelectedPortsLabel'
import { onLocalPortsChange as updateLocalPorts, removePortFromSelection as removeSelectedPort } from '~/utils/lagPortSelection'

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
const { confirm } = useConfirm()

const isOpen = ref(false)
const saving = ref(false)
const lagFormRef = ref<{ submit: () => void } | null>(null)
const editingLag = ref<LAGGroup | null>(null)
const isDuplicate = ref(false)
const isEdit = computed(() => !!editingLag.value)
const localPortMenuOpen = ref(false)

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
  selectedRemoteSwitchId,
  remoteLags,
  portMapping,
  switchOptions,
  selectedSwitchOption,
  existingRemoteLag,
  remotePortLagConflicts,
  hasConnectionConflicts,
  remoteSwitchMissingVlans,
  remoteConfiguredVlansList,
  showPortMapping,
  resolveSwitchUuid,
  onRemoteModeChange,
  onSwitchSelect,
  fetchSwitches,
  fetchRemoteLags,
  initPortMapping,
  getRemotePortOption,
  availableRemotePortOptions,
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

// Unsaved-changes guard. Editable state spans form + VLAN + remote-connection refs.
const { takeSnapshot, requestClose, onOpenChange } = useSlideoverGuard(
  () => ({
    ...form,
    vlanForm: { ...vlanForm },
    portMapping: { ...portMapping },
    remoteMode: remoteMode.value,
    selectedRemoteSwitchId: selectedRemoteSwitchId.value
  }),
  () => { isOpen.value = false }
)

const remoteConnectionModes = computed(() => [
  { label: t('common.none'), value: 'none' as const },
  { label: 'Switch', value: 'switch' as const },
  { label: t('switches.ports.freetext'), value: 'freetext' as const },
])

function getPortLabel(portId: string): string {
  return resolvePortLabel(props.ports, portId)
}

const availableLocalPortOptions = computed(() => buildLagPortOptions(
  form.port_ids,
  props.ports.filter(port => !props.existingLags.some(lag => lag.id !== editingLag.value?.id && lag.port_ids.includes(port.id))),
  editingLag.value?.id
))

function onLocalPortsChange(portIds: string[]) {
  updateLocalPorts(form, localPortMenuOpen, portIds)
}

function removePort(portId: string) {
  form.port_ids = removeLagPort(form.port_ids, portId)
  delete portMapping[portId]
}

function removePortFromSelection(portId: string) {
  removeSelectedPort(form, portMapping, localPortMenuOpen, portId)
}

function validate(state: { name?: string; port_ids: string[] }) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('lag.validation.nameRequired') })
  } else if (state.name.length > 100) {
    errors.push({ name: 'name', message: t('lag.validation.nameTooLong') })
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

const { fetch: refreshLags } = useLagGroups(props.switchId, toRef(() => props.siteId ?? ''))
const submittedLocalLagId = ref<string | null>(null)
const submittedRemoteLagId = ref<string | null>(null)
const submittedRemoteLagPortIds = ref<string[] | null>(null)

// --- onSubmit stage functions ---

async function createOrUpdateLocalLag(): Promise<void> {
  const body = {
    name: form.name.trim(),
    port_ids: [...form.port_ids],
    ...(isDuplicate.value ? {} : { description: form.description.trim() || undefined }),
    ...(!isDuplicate.value ? {
      remote_device: remoteMode.value !== 'none' ? (form.remote_device.trim() || undefined) : undefined,
      remote_device_id: remoteMode.value === 'switch' ? (selectedRemoteSwitchId.value || undefined) : undefined
    } : {}),
  }
  if (!isDuplicate.value && remoteMode.value === 'switch' && selectedRemoteSwitchId.value) {
    Object.assign(body, { sync: {
      remote_switch_id: selectedRemoteSwitchId.value,
      mappings: form.port_ids.map(local_port_id => ({ local_port_id, remote_port_id: portMapping[local_port_id]?.remotePortId })).filter(m => m.remote_port_id),
      port_mode: vlanForm.port_mode,
      access_vlan: vlanForm.port_mode === 'access' ? vlanForm.access_vlan : null,
      native_vlan: vlanForm.port_mode === 'trunk' ? vlanForm.native_vlan : null,
      tagged_vlans: vlanForm.port_mode === 'trunk' ? [...vlanForm.tagged_vlans] : []
    } })
  }
  let result: LAGGroup | undefined
  const request = buildLagSaveRequest({ switchId: props.switchId, lagId: editingLag.value?.id, siteId: props.siteId, isEdit: isEdit.value, isDuplicate: isDuplicate.value, body })
  await saveLagLocally({ isEdit: isEdit.value, duplicate: isDuplicate.value, remoteSwitch: remoteMode.value === 'switch', update: async () => { result = await executeLagSaveRequest(request, (url, options) => $fetch<LAGGroup>(url, options)) }, create: async () => { result = await executeLagSaveRequest(request, (url, options) => $fetch<LAGGroup>(url, options)) } })
  await refreshLags()
  if (result) submittedLocalLagId.value = result.id
}

async function updateLocalPortConnections(): Promise<void> {
  if (remoteMode.value === 'switch') return
  if (remoteMode.value !== 'none' && form.remote_device.trim()) {
    for (const portId of form.port_ids) {
      const mapping = portMapping[portId]
      const portBody: Record<string, string | null> = {
        connected_device: form.remote_device.trim(),
        connected_device_id: null,
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
  if (!isDuplicate.value && remoteMode.value === 'switch') return
  const vlanUpdates: Record<string, unknown> = {
    port_mode: vlanForm.port_mode
  }
  if (vlanForm.port_mode === 'access') {
    vlanUpdates.access_vlan = vlanForm.access_vlan
    vlanUpdates.native_vlan = null
    vlanUpdates.tagged_vlans = []
  } else {
    vlanUpdates.access_vlan = null
    vlanUpdates.native_vlan = vlanForm.native_vlan
    vlanUpdates.tagged_vlans = [...vlanForm.tagged_vlans]
  }
  // Apply to local LAG ports
  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
        body: { port_ids: [...form.port_ids], lag_group_id: submittedLocalLagId.value || editingLag.value?.id, updates: vlanUpdates },
      query: localQuery.value
    })
    toast.add({ title: t('lag.vlanApplied', { count: form.port_ids.length }), color: 'success' })
   } catch (e: unknown) {
     const err = e as { data?: { message?: string } }
     toast.add({ title: err?.data?.message || t('lag.vlanApplyFailed'), color: 'error' })
     throw e
  }
}

async function onSubmit() {
  const errors = validate(form)
  if (errors.length > 0) return

  if (!isDuplicate.value && hasConnectionConflicts.value) {
    if (!(await confirm({ title: t('lag.conflictConfirmTitle'), message: t('lag.conflictConfirm') }))) return
  }

  if (!isDuplicate.value && existingRemoteLag.value && !isEdit.value) {
    if (!(await confirm({ title: t('lag.replaceRemoteLagTitle'), message: t('lag.replaceRemoteLag', { name: existingRemoteLag.value.name, switch: form.remote_device }) }))) return
  }

  saving.value = true
  try {
    await submitLagSequence({
      remoteLagId: submittedRemoteLagId,
      remoteLagPortIds: submittedRemoteLagPortIds,
      createOrUpdateLocalLag,
       updateLocalPortConnections: !isDuplicate.value ? updateLocalPortConnections : undefined,
      applyVlanConfig,
      onSuccess: () => {
      toast.add({
        title: isEdit.value ? t('lag.messages.updated') : t('lag.messages.created'),
        color: 'success'
      })
      isOpen.value = false
      emit('saved')
      }
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openCreate(portIds: string[]) {
  isDuplicate.value = false
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
  takeSnapshot()
}

function duplicateLag() {
  if (!editingLag.value) return
  const source = editingLag.value
  const name = suggestLagCopyName(source.name, props.existingLags.map(lag => lag.name))

  editingLag.value = null
  isDuplicate.value = true
  form.name = name
  form.description = ''
  form.port_ids = []
  form.remote_device = ''
  form.remote_device_id = undefined
  remoteMode.value = 'none'
  selectedRemoteSwitchId.value = ''
  remoteLags.value = []
  for (const key of Object.keys(portMapping)) delete portMapping[key]
  const firstPort = props.ports.find(port => source.port_ids.includes(port.id))
  vlanForm.port_mode = firstPort?.port_mode || 'access'
  vlanForm.access_vlan = firstPort?.access_vlan || null
  vlanForm.native_vlan = firstPort?.native_vlan || null
  vlanForm.tagged_vlans = [...(firstPort?.tagged_vlans || [])]
  isOpen.value = true
  takeSnapshot()
}

async function openEdit(lag: LAGGroup, removePortId?: string) {
  isDuplicate.value = false
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
    // Normalize to UUID now that the switch list is loaded — stored data may be a
    // slug (older mirror LAGs) which wouldn't match the UUID-keyed options.
    selectedRemoteSwitchId.value = resolveSwitchUuid(lag.remote_device_id)
    await fetchRemoteLags(selectedRemoteSwitchId.value)
  }
  if (removePortId) removePort(removePortId)
  // Snapshot after async UUID normalization has settled.
  takeSnapshot()
}

defineExpose({ openCreate, openEdit, duplicateLag })
</script>
