<script setup lang="ts">
import type { MediaType, Port, PortStatus } from '~/types/models'

interface PortForm {
  status: PortStatus
  label: string
  vlan: string
  connectedDevice: string
  macAddress: string
  mediaType: MediaType
  description: string
  speed: string
  duplex: '' | 'half' | 'full' | 'auto'
  poe: boolean
  patchTarget: string
}

const props = defineProps<{
  open: boolean
  port?: Port
  fallbackPortNumber?: number
  switchName: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: Port]
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
  duplex: '',
  poe: false,
  patchTarget: ''
})


const statusOptions: Array<{ value: PortStatus; label: string }> = [
  { value: 'free', label: 'frei' },
  { value: 'used', label: 'belegt' },
  { value: 'disabled', label: 'deaktiviert' },
  { value: 'error', label: 'fehlerhaft' }
]

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
  form.duplex = port?.duplex ?? ''
  form.poe = port?.poe ?? false
  form.patchTarget = port?.patchTarget ?? ''
  errors.value = {}
}

function resetForm() {
  applyPort(props.port)
}

const portNumber = computed(() => props.port?.portNumber ?? props.fallbackPortNumber)

const statusLabel = computed(() => statusOptions.find((opt) => opt.value === form.status)?.label ?? form.status)

function validVlan(value: string) {
  if (!value.trim()) return true
  if (!/^\d+$/.test(value.trim())) return false
  const num = Number(value)
  return num >= 1 && num <= 4094
}

function validMac(value: string) {
  if (!value.trim()) return true
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value.trim())
}

function validate() {
  const validationErrors: Record<string, string> = {}

  if (!validVlan(form.vlan)) {
    validationErrors.vlan = 'VLAN muss zwischen 1 und 4094 liegen.'
  }

  if (!validMac(form.macAddress)) {
    validationErrors.macAddress = 'MAC-Format z. B. AA:BB:CC:DD:EE:FF verwenden.'
  }

  errors.value = validationErrors
  return Object.keys(validationErrors).length === 0
}

async function onSave() {
  if (!props.port || !validate()) return
  saving.value = true
  try {
    const payload: Port = {
      ...props.port,
      status: form.status,
      label: form.label.trim() || undefined,
      vlan: form.vlan.trim() || undefined,
      connectedDevice: form.connectedDevice.trim() || undefined,
      macAddress: form.macAddress.trim() || undefined,
      mediaType: form.mediaType,
      description: form.description.trim() || undefined,
      speed: form.speed.trim() || undefined,
      duplex: form.duplex || undefined,
      poe: form.poe,
      patchTarget: form.patchTarget.trim() || undefined
    }

    emit('save', payload)
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}

watch(() => props.port, (port) => applyPort(port), { immediate: true })
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    applyPort(props.port)
  }
})

</script>

<template>
  <div v-if="open && (port || fallbackPortNumber)" class="port-edit-inline">
    <aside class="port-edit-panel panel">
      <div class="row row-between">
        <div>
          <h3 class="section-title">Port {{ portNumber }}</h3>
          <p class="port-subtitle">Switch: {{ switchName }}</p>
        </div>
        <button class="button--ghost" @click="close">Schließen</button>
      </div>

      <div class="row port-status-headline">
        <span>Aktueller Status:</span>
        <PortBadge :status="form.status" />
        <strong>{{ statusLabel }}</strong>
      </div>

      <div class="stack port-form-grid">
          <label class="field">
            <span>Status</span>
            <select v-model="form.status">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>Typ</span>
            <select v-model="form.mediaType">
              <option v-for="media in mediaTypeOptions" :key="media" :value="media">{{ media }}</option>
            </select>
          </label>

          <label class="field">
            <span>Label</span>
            <input v-model="form.label" type="text" placeholder="z. B. Arbeitsplatz A-12" />
          </label>

          <label class="field">
            <span>VLAN</span>
            <input v-model="form.vlan" type="number" min="1" max="4094" placeholder="1-4094" />
            <small v-if="errors.vlan" class="field-error">{{ errors.vlan }}</small>
          </label>

          <label class="field">
            <span>Gerät</span>
            <input v-model="form.connectedDevice" type="text" placeholder="Hostname / Gerät" />
          </label>

          <label class="field">
            <span>MAC</span>
            <input v-model="form.macAddress" type="text" placeholder="AA:BB:CC:DD:EE:FF" />
            <small v-if="errors.macAddress" class="field-error">{{ errors.macAddress }}</small>
          </label>

          <label class="field field--full">
            <span>Beschreibung</span>
            <textarea v-model="form.description" rows="3" placeholder="Optionale Beschreibung" />
          </label>

          <label class="field">
            <span>Geschwindigkeit</span>
            <select v-model="form.speed">
              <option value="">-</option>
              <option value="10M">10M</option>
              <option value="100M">100M</option>
              <option value="1G">1G</option>
              <option value="2.5G">2.5G</option>
              <option value="10G">10G</option>
              <option value="40G">40G</option>
            </select>
          </label>

          <label class="field">
            <span>Duplex</span>
            <select v-model="form.duplex">
              <option value="">-</option>
              <option value="auto">Auto</option>
              <option value="full">Full</option>
              <option value="half">Half</option>
            </select>
          </label>

          <label class="field field-checkbox">
            <input v-model="form.poe" type="checkbox" />
            <span>PoE aktiv</span>
          </label>

          <label class="field">
            <span>Patch-Ziel</span>
            <input v-model="form.patchTarget" type="text" placeholder="z. B. Patchpanel PP-01/24" />
          </label>
        </div>

      <div class="row row-end">
        <button class="button--ghost" @click="resetForm">Zurücksetzen</button>
        <button class="secondary" @click="close">Abbrechen</button>
        <button :disabled="saving" @click="onSave">{{ saving ? 'Speichern…' : 'Speichern' }}</button>
      </div>
    </aside>
  </div>
</template>
