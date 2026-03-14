<script setup lang="ts">
import type { MediaType, Port, PortStatus, PortUpdatePayload } from '~/types/models'

interface PortForm {
  status: PortStatus
  label: string
  vlan: string | number
  connectedDevice: string
  macAddress: string
  mediaType: MediaType
  description: string
  speed: string
  duplex: 'half' | 'full' | 'auto'
  poe: boolean
  patchTarget: string
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

const props = defineProps<{
  open: boolean
  port?: Port
  fallbackPortNumber?: number
  switchName: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: PortUpdatePayload]
}>()

const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive<PortForm>({
  status: 'free',
  label: '',
  vlan: '',
  connectedDevice: '',
  macAddress: '',
  mediaType: 'RJ45',
  description: '',
  speed: '',
  duplex: 'auto',
  poe: false,
  patchTarget: ''
})

const openProxy = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) emit('close')
  }
})

const statusOptions: PortStatus[] = ['free', 'used', 'disabled', 'error']

const mediaTypeOptions: MediaType[] = ['RJ45', 'SFP', 'SFP+', 'QSFP']

function applyPort(port?: Port) {
  form.status = port?.status ?? 'free'
  form.label = port?.label ?? ''
  form.vlan = port?.vlan ?? ''
  form.connectedDevice = port?.connectedDevice ?? ''
  form.macAddress = port?.macAddress ?? ''
  form.mediaType = port?.mediaType ?? 'RJ45'
  form.description = port?.description ?? ''
  form.speed = port?.speed ?? ''
  form.duplex = port?.duplex ?? 'auto'
  form.poe = port?.poe ?? false
  form.patchTarget = port?.patchTarget ?? ''
  errors.value = {}
}

function resetForm() {
  applyPort(props.port)
}

const portNumber = computed(() => props.port?.portNumber ?? props.fallbackPortNumber)
const statusLabel = computed(() => form.status)

function validVlan(value: unknown) {
  const normalized = asTrimmedString(value)
  if (!normalized) return true
  if (!/^\d+$/.test(normalized)) return false
  const num = Number(normalized)
  return num >= 1 && num <= 4094
}

function validMac(value: unknown) {
  const normalized = asTrimmedString(value)
  if (!normalized) return true
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(normalized)
}

function validate() {
  const validationErrors: Record<string, string> = {}

  if (!validVlan(form.vlan)) {
    validationErrors.vlan = 'VLAN must be between 1 and 4094.'
  }

  if (!validMac(form.macAddress)) {
    validationErrors.macAddress = 'Use MAC format AA:BB:CC:DD:EE:FF.'
  }

  errors.value = validationErrors
  return Object.keys(validationErrors).length === 0
}

async function onSave() {
  if (!validate()) return
  saving.value = true
  try {
    const normalized = {
      label: asTrimmedString(form.label),
      vlan: asTrimmedString(form.vlan),
      connectedDevice: asTrimmedString(form.connectedDevice),
      macAddress: asTrimmedString(form.macAddress),
      description: asTrimmedString(form.description),
      speed: asTrimmedString(form.speed),
      patchTarget: asTrimmedString(form.patchTarget)
    }

    emit('save', {
      status: form.status,
      label: normalized.label,
      vlan: normalized.vlan,
      connectedDevice: normalized.connectedDevice,
      macAddress: normalized.macAddress,
      mediaType: form.mediaType,
      description: normalized.description,
      speed: normalized.speed,
      duplex: form.duplex || 'auto',
      poe: form.poe,
      patchTarget: normalized.patchTarget
    })
  } finally {
    saving.value = false
  }
}

watch(() => props.port, (port) => applyPort(port), { immediate: true })
watch(() => props.open, (isOpen) => {
  if (isOpen) applyPort(props.port)
})
</script>

<template>
  <USlideover v-model:open="openProxy" :ui="{ content: 'max-w-3xl' }">
    <UCard class="h-full rounded-none border-0">
      <template #header>
        <div class="row row-between">
          <div>
            <h3 class="section-title">Port {{ portNumber }}</h3>
            <p class="port-subtitle">Switch: {{ switchName }}</p>
          </div>
          <UButton color="neutral" variant="ghost" label="Close" @click="emit('close')" />
        </div>
      </template>

      <div v-if="open && (port || fallbackPortNumber)" class="stack">
        <div class="row port-status-headline">
          <span>Current status:</span>
          <PortBadge :status="form.status" />
          <strong>{{ statusLabel }}</strong>
        </div>

        <UForm :state="form" class="stack" @submit.prevent="onSave">
          <div class="port-form-grid">
            <label class="field"><span>Status</span><USelect v-model="form.status" :items="statusOptions" /></label>
            <label class="field"><span>Type</span><USelect v-model="form.mediaType" :items="mediaTypeOptions" /></label>
            <label class="field"><span>Label</span><UInput v-model="form.label" placeholder="e.g. Workstation A-12" /></label>
            <label class="field"><span>VLAN</span><UInput v-model="form.vlan" type="number" min="1" max="4094" placeholder="1-4094" /><small v-if="errors.vlan" class="field-error">{{ errors.vlan }}</small></label>
            <label class="field"><span>Device</span><UInput v-model="form.connectedDevice" placeholder="Hostname / Device" /></label>
            <label class="field"><span>MAC</span><UInput v-model="form.macAddress" placeholder="AA:BB:CC:DD:EE:FF" /><small v-if="errors.macAddress" class="field-error">{{ errors.macAddress }}</small></label>
            <label class="field field--full"><span>Description</span><UTextarea v-model="form.description" :rows="3" placeholder="Optional description" /></label>
            <label class="field"><span>Speed</span><USelect v-model="form.speed" :items="['', '10M', '100M', '1G', '2.5G', '10G', '40G']" /></label>
            <label class="field"><span>Duplex</span><USelect v-model="form.duplex" :items="['auto', 'full', 'half']" /></label>
            <label class="field field-checkbox"><UCheckbox v-model="form.poe" /><span>PoE enabled</span></label>
            <label class="field"><span>Patch target</span><UInput v-model="form.patchTarget" placeholder="e.g. Patch panel PP-01/24" /></label>
          </div>

          <div class="row row-end">
            <UButton type="button" color="neutral" variant="soft" label="Reset" @click="resetForm" />
            <UButton type="button" color="neutral" variant="soft" label="Cancel" @click="emit('close')" />
            <UButton type="submit" :loading="saving" :label="saving ? 'Saving...' : 'Save'" />
          </div>
        </UForm>
      </div>
    </UCard>
  </USlideover>
</template>
