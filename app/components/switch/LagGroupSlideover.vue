<template>
  <USlideover
    v-model:open="isOpen"
    :title="isEdit ? $t('lag.edit') : $t('lag.create')"
    :description="isEdit ? $t('lag.editDescription') : $t('lag.createDescription')"
  >
    <template #body>
      <UForm :state="form" :validate="validate" :validate-on="['blur', 'change']" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('lag.name') + ' *'" name="name" required>
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

          <!-- Switch from DB -->
          <USelectMenu
            v-if="remoteMode === 'switch'"
            :search-input="false"
            :model-value="selectedSwitchOption"
            :items="switchOptions"
            by="value"
            class="w-full"
            @update:model-value="onSwitchSelect"
          />

          <!-- Freetext device name -->
          <UInput
            v-if="remoteMode === 'freetext'"
            v-model="form.remote_device"
            :placeholder="$t('lag.remoteDevicePlaceholder')"
            class="w-full"
          />
        </UFormField>

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
                <!-- Local port label -->
                <span class="w-24 shrink-0 truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                  {{ getPortLabel(portId) }}
                </span>
                <span class="text-xs text-gray-400">→</span>

                <!-- Remote port: dropdown for switch, text for freetext -->
                <USelectMenu
                  v-if="remoteMode === 'switch' && selectedRemoteSwitchId"
                  :search-input="false"
                  :model-value="getRemotePortOption(portId)"
                  :items="remotePortOptions"
                  by="value"
                  placeholder="Select port..."
                  class="w-full"
                  @update:model-value="(val: any) => setRemotePort(portId, val)"
                />
                <UInput
                  v-else-if="remoteMode === 'freetext'"
                  :model-value="portMapping[portId]?.remotePortLabel || ''"
                  placeholder="e.g. Gi1/0/1"
                  class="w-full"
                  @update:model-value="(val: string) => setRemotePortFreetext(portId, val)"
                />
              </div>
              <!-- Conflict warning -->
              <div v-if="getPortConflict(portId)" class="ml-[6.5rem] rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400">
                {{ $t('common.warning') }}: {{ getPortConflict(portId) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Global conflict warning -->
        <div v-if="hasConflicts" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <span class="font-semibold">{{ $t('common.warning') }}:</span>
          {{ $t('lag.conflictWarning') }}
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :loading="saving" icon="i-heroicons-check" @click="onSubmit">
          {{ isEdit ? $t('common.save') : $t('lag.create') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { LAGGroup } from '~~/types/lagGroup'
import { resolvePortLabel } from '~/utils/ports'

const props = defineProps<{
  switchId: string
  ports: any[]
  existingLags: LAGGroup[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApiFetch()

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

// Remote connection mode
const remoteMode = ref<'none' | 'switch' | 'freetext'>('none')
const remoteConnectionModes = computed(() => [
  { label: t('common.none'), value: 'none' as const },
  { label: 'Switch', value: 'switch' as const },
  { label: t('switches.ports.freetext'), value: 'freetext' as const },
])

function onRemoteModeChange(mode: 'none' | 'switch' | 'freetext') {
  remoteMode.value = mode
  if (mode === 'none') {
    form.remote_device = ''
    form.remote_device_id = undefined
    selectedRemoteSwitchId.value = ''
    for (const key of Object.keys(portMapping)) delete portMapping[key]
  }
}

// All switches for remote device dropdown
const allSwitches = ref<any[]>([])
const selectedRemoteSwitchId = ref('')

const switchOptions = computed(() => [
  { label: '— None —', value: '' },
  ...allSwitches.value
    .filter(s => s.id !== props.switchId)
    .map(s => ({ label: s.name, value: s.id }))
])

const selectedSwitchOption = computed(() =>
  switchOptions.value.find(o => o.value === selectedRemoteSwitchId.value) || switchOptions.value[0]
)

function onSwitchSelect(option: any) {
  selectedRemoteSwitchId.value = option?.value || ''
  const sw = allSwitches.value.find(s => s.id === option?.value)
  form.remote_device = sw?.name || ''
  form.remote_device_id = option?.value || undefined
  // Clear port mapping when switching remote device
  for (const key of Object.keys(portMapping)) delete portMapping[key]
}

// Remote port options for selected switch (with conflict info)
const remotePortOptions = computed(() => {
  if (!selectedRemoteSwitchId.value) return []
  const sw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
  if (!sw?.ports) return []
  return [
    { label: '— None —', value: '', conflict: '' },
    ...sw.ports.map((p: any) => {
      const label = p.label || `${p.unit}/${p.index}`
      // Check if this remote port is already connected to something else
      let conflict = ''
      if (p.connected_device_id && p.connected_device_id !== props.switchId) {
        conflict = `→ ${p.connected_device || 'Unknown'}`
      } else if (p.connected_device_id === props.switchId && p.connected_port_id) {
        // Connected to our switch but maybe a different port (not in this LAG)
        const isOurLagPort = form.port_ids.includes(p.connected_port_id)
        if (!isOurLagPort) {
          const ourPort = props.ports.find((lp: any) => lp.id === p.connected_port_id)
          conflict = `→ ${ourPort?.label || 'this switch'}`
        }
      }
      return {
        label: conflict ? `${label}  ⚠ ${conflict}` : label,
        value: p.id,
        conflict
      }
    })
  ]
})

// Port mapping: local portId → { remotePortId, remotePortLabel }
const portMapping = reactive<Record<string, { remotePortId: string; remotePortLabel: string }>>({})

function getRemotePortOption(localPortId: string) {
  const mapping = portMapping[localPortId]
  if (!mapping?.remotePortId) return remotePortOptions.value[0]
  return remotePortOptions.value.find(o => o.value === mapping.remotePortId) || remotePortOptions.value[0]
}

function setRemotePort(localPortId: string, option: any) {
  const portId = option?.value || ''
  const sw = allSwitches.value.find(s => s.id === selectedRemoteSwitchId.value)
  const remotePort = sw?.ports?.find((p: any) => p.id === portId)
  portMapping[localPortId] = {
    remotePortId: portId,
    remotePortLabel: remotePort?.label || option?.label?.replace(/\s+⚠.*/, '') || ''
  }
}

function setRemotePortFreetext(localPortId: string, label: string) {
  portMapping[localPortId] = {
    remotePortId: '',
    remotePortLabel: label
  }
}

// Conflict check per port
function getPortConflict(localPortId: string): string | null {
  if (remoteMode.value !== 'switch') return null
  const mapping = portMapping[localPortId]
  if (!mapping?.remotePortId) return null
  const option = remotePortOptions.value.find(o => o.value === mapping.remotePortId)
  if (option?.conflict) {
    return t('lag.portAlreadyConnected', { port: mapping.remotePortLabel, device: option.conflict.replace('→ ', '') })
  }
  return null
}

const hasConflicts = computed(() => {
  return form.port_ids.some(pid => getPortConflict(pid) !== null)
})

// Show port mapping when a remote device is configured
const showPortMapping = computed(() => {
  if (remoteMode.value === 'switch' && selectedRemoteSwitchId.value) return true
  if (remoteMode.value === 'freetext' && form.remote_device.trim()) return true
  return false
})

function getPortLabel(portId: string): string {
  return resolvePortLabel(props.ports, portId)
}

function removePort(portId: string) {
  form.port_ids = form.port_ids.filter(id => id !== portId)
  delete portMapping[portId]
}

function validate(state: any) {
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

const { create, update } = useLagGroups(props.switchId)

async function onSubmit() {
  const errors = validate(form)
  if (errors.length > 0) return

  // Confirm if there are conflicts
  if (hasConflicts.value) {
    if (!window.confirm(t('lag.conflictConfirm'))) return
  }

  saving.value = true
  try {
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

    // Update connected device + port mapping on all member ports
    if (remoteMode.value !== 'none' && form.remote_device.trim()) {
      for (const portId of form.port_ids) {
        const mapping = portMapping[portId]
        const portBody: Record<string, any> = {
          connected_device: form.remote_device.trim(),
          connected_device_id: remoteMode.value === 'switch' ? (selectedRemoteSwitchId.value || null) : null,
          connected_port_id: mapping?.remotePortId || null,
          connected_port: mapping?.remotePortLabel || null,
        }
        try {
          await $fetch(`/api/switches/${props.switchId}/ports/${portId}`, { method: 'PUT', body: portBody })
        } catch { /* best-effort */ }
      }
    } else if (remoteMode.value === 'none') {
      // Clear connection on all member ports
      for (const portId of form.port_ids) {
        try {
          await $fetch(`/api/switches/${props.switchId}/ports/${portId}`, {
            method: 'PUT',
            body: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null }
          })
        } catch { /* best-effort */ }
      }
    }

    toast.add({
      title: isEdit.value ? t('lag.messages.updated') : t('lag.messages.created'),
      color: 'success'
    })

    isOpen.value = false
    emit('saved')
  } catch (e: any) {
    toast.add({ title: e?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function fetchSwitches() {
  try {
    const data = await apiFetch<any>('/api/switches')
    allSwitches.value = data.data || data
  } catch { /* ignore */ }
}

function initPortMapping() {
  for (const portId of form.port_ids) {
    const port = props.ports.find(p => p.id === portId)
    if (port) {
      portMapping[portId] = {
        remotePortId: port.connected_port_id || '',
        remotePortLabel: port.connected_port || ''
      }
    }
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
  for (const key of Object.keys(portMapping)) delete portMapping[key]
  isOpen.value = true
  fetchSwitches()
}

function openEdit(lag: LAGGroup) {
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

  isOpen.value = true
  fetchSwitches()
}

defineExpose({ openCreate, openEdit })
</script>
