<template>
  <USlideover v-model="isOpen">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ port?.label || `Port ${port?.unit}/${port?.index}` }}</h3>
          <UButton variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
        </div>
      </template>

      <div v-if="port" class="space-y-4">
        <div class="flex gap-2">
          <UBadge>{{ port.type }}</UBadge>
          <UBadge :color="port.status === 'up' ? 'green' : port.status === 'disabled' ? 'red' : 'gray'">{{ port.status }}</UBadge>
        </div>

        <UFormGroup label="Status">
          <USelect v-model="form.status" :options="['up', 'down', 'disabled']" />
        </UFormGroup>

        <UFormGroup label="Speed">
          <USelect v-model="form.speed" :options="speeds" placeholder="Select speed" />
        </UFormGroup>

        <UFormGroup label="Native VLAN">
          <UInput v-model.number="form.native_vlan" type="number" placeholder="VLAN ID" />
        </UFormGroup>

        <UFormGroup label="Tagged VLANs">
          <UInput v-model="taggedVlansStr" placeholder="e.g. 100,200,300" />
        </UFormGroup>

        <!-- Connected Device: freetext or switch reference -->
        <UFormGroup label="Connected Device">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <button
                class="px-2 py-1 text-xs font-medium rounded border transition-colors"
                :class="connectionMode === 'freetext'
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'"
                @click="connectionMode = 'freetext'"
              >Freetext</button>
              <button
                class="px-2 py-1 text-xs font-medium rounded border transition-colors"
                :class="connectionMode === 'switch'
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'"
                @click="connectionMode = 'switch'"
              >Switch Reference</button>
            </div>

            <!-- Freetext mode -->
            <UInput
              v-if="connectionMode === 'freetext'"
              v-model="form.connected_device"
              placeholder="Device name or hostname"
            />

            <!-- Switch reference mode -->
            <template v-if="connectionMode === 'switch'">
              <USelect
                v-model="selectedSwitchId"
                :options="switchOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="Select switch..."
              />
              <USelect
                v-if="selectedSwitchId && remotePortOptions.length"
                v-model="selectedPortId"
                :options="remotePortOptions"
                option-attribute="label"
                value-attribute="value"
                placeholder="Select port..."
              />
              <p v-if="selectedSwitchId && !loadingSwitches && !remotePortOptions.length" class="text-xs text-gray-500">
                No available ports on this switch.
              </p>
              <!-- Port conflict warning -->
              <div v-if="portConflict" class="rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-400">
                <span class="font-semibold">Warning:</span> This port is already connected to
                <span class="font-medium text-yellow-300">{{ portConflict.device }} → {{ portConflict.port }}</span>.
                Saving will override that connection.
              </div>
            </template>
          </div>
        </UFormGroup>

        <!-- Connected Port display/edit -->
        <UFormGroup label="Connected Port">
          <div v-if="connectionMode === 'switch' && selectedSwitchId && selectedPortId" class="flex items-center gap-2">
            <UBadge color="blue" variant="subtle">
              {{ selectedPortLabel }}
            </UBadge>
          </div>
          <p v-else-if="connectionMode === 'switch' && !selectedPortId" class="text-xs text-gray-500">
            No port selected
          </p>
          <UInput
            v-else
            v-model="form.connected_port"
            placeholder="Port name"
          />
        </UFormGroup>

        <UFormGroup label="Description">
          <UInput v-model="form.description" />
        </UFormGroup>

        <UFormGroup label="MAC Address">
          <UInput v-model="form.mac_address" placeholder="XX:XX:XX:XX:XX:XX" />
        </UFormGroup>
      </div>

      <!-- Port status prompt -->
      <div v-if="showSetUpPrompt" class="mx-4 mb-4 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
        <p class="text-sm text-primary-300 mb-2">
          This port is currently <span class="font-semibold">"down"</span>. Set it to <span class="font-semibold">"up"</span> since you are connecting it?
        </p>
        <div class="flex gap-2">
          <UButton size="xs" color="primary" @click="form.status = 'up'; showSetUpPrompt = false; save()">
            Yes, set to up
          </UButton>
          <UButton size="xs" variant="soft" color="gray" @click="showSetUpPrompt = false; save()">
            No, keep down
          </UButton>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton color="red" variant="soft" icon="i-heroicons-arrow-path" @click="resetPort">
            Reset Port
          </UButton>
          <div class="flex gap-2">
            <UButton variant="ghost" @click="isOpen = false">Cancel</UButton>
            <UButton @click="onSaveClick">Save</UButton>
          </div>
        </div>
      </template>
    </UCard>
  </USlideover>
</template>

<script setup lang="ts">
const props = defineProps<{
  port: any
  switchId: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const isOpen = defineModel<boolean>()
const toast = useToast()
const { apiFetch } = useApiFetch()
const speeds = ['100M', '1G', '2.5G', '10G', '100G']

const connectionMode = ref<'freetext' | 'switch'>('freetext')
const selectedSwitchId = ref('')
const selectedPortId = ref('')
const allSwitches = ref<any[]>([])
const loadingSwitches = ref(false)

const form = reactive({
  status: '',
  speed: '',
  native_vlan: null as number | null,
  connected_device: '',
  connected_port: '',
  description: '',
  mac_address: ''
})

const taggedVlansStr = ref('')

async function fetchSwitches() {
  loadingSwitches.value = true
  try {
    const data = await apiFetch<any>('/api/switches')
    allSwitches.value = data.data || data
  } catch { /* ignore */ }
  finally { loadingSwitches.value = false }
}

const switchOptions = computed(() => {
  return [
    { label: '-- None --', value: '' },
    ...allSwitches.value.map(s => ({
      label: s.id === props.switchId ? `${s.name} (this switch)` : s.name,
      value: s.id
    }))
  ]
})

const remotePortOptions = computed(() => {
  if (!selectedSwitchId.value) return []
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  if (!sw?.ports) return []
  return [
    { label: '-- None --', value: '' },
    ...sw.ports
      .filter((p: any) => {
        // For self-switch: exclude the port being edited
        if (selectedSwitchId.value === props.switchId && p.id === props.port?.id) return false
        return true
      })
      .map((p: any) => {
        let label = p.label || `${p.unit}/${p.index}`
        // Mark ports that are already connected elsewhere
        if (p.connected_device_id && !(p.connected_device_id === props.switchId && p.connected_port_id === props.port?.id)) {
          label += ` (→ ${p.connected_device})`
        }
        return { label, value: p.id }
      })
  ]
})

// Check if selected port is already connected to someone else
const portConflict = computed(() => {
  if (!selectedSwitchId.value || !selectedPortId.value) return null
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
  if (!port?.connected_device_id) return null
  // If already connected to this port on this switch, no conflict
  if (port.connected_device_id === props.switchId && port.connected_port_id === props.port?.id) return null
  return {
    device: port.connected_device || 'Unknown',
    port: port.connected_port || 'Unknown port'
  }
})

const selectedPortLabel = computed(() => {
  if (!selectedSwitchId.value || !selectedPortId.value) return ''
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
  return port?.label || `${port?.unit}/${port?.index}` || selectedPortId.value
})

// Store pending port selection to apply after switches load
const pendingSwitchId = ref('')
const pendingPortId = ref('')

watch(() => props.port, (p) => {
  if (p) {
    form.status = p.status
    form.speed = p.speed || ''
    form.native_vlan = p.native_vlan || null
    form.connected_device = p.connected_device || ''
    form.connected_port = p.connected_port || ''
    form.description = p.description || ''
    form.mac_address = p.mac_address || ''
    taggedVlansStr.value = (p.tagged_vlans || []).join(',')

    if (p.connected_device_id) {
      connectionMode.value = 'switch'
      pendingSwitchId.value = p.connected_device_id
      pendingPortId.value = p.connected_port_id || ''
      // Set immediately if switches already loaded
      if (allSwitches.value.length) {
        selectedSwitchId.value = p.connected_device_id
        selectedPortId.value = p.connected_port_id || ''
      }
    } else {
      connectionMode.value = 'freetext'
      selectedSwitchId.value = ''
      selectedPortId.value = ''
      pendingSwitchId.value = ''
      pendingPortId.value = ''
    }
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (open) {
    await fetchSwitches()
    // Apply pending selection after switches are loaded
    if (pendingSwitchId.value) {
      selectedSwitchId.value = pendingSwitchId.value
      selectedPortId.value = pendingPortId.value
    }
  }
})

// Reset port selection when switch changes (but not on initial load)
const userChangedSwitch = ref(false)
watch(selectedSwitchId, (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) {
    selectedPortId.value = ''
  }
})

const showSetUpPrompt = ref(false)

async function onSaveClick() {
  const hasNewConnection = connectionMode.value === 'switch' && selectedSwitchId.value && selectedPortId.value
  const isDown = form.status === 'down'

  if (hasNewConnection && isDown) {
    showSetUpPrompt.value = true
    return
  }
  await save()
}

async function save() {
  const tagged_vlans = taggedVlansStr.value
    ? taggedVlansStr.value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
    : []

  const body: Record<string, any> = {
    ...form,
    tagged_vlans
  }

  if (connectionMode.value === 'switch' && selectedSwitchId.value) {
    const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
    body.connected_device = sw?.name || ''
    body.connected_device_id = selectedSwitchId.value
    body.connected_port_id = selectedPortId.value || null
    if (selectedPortId.value) {
      const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
      body.connected_port = port?.label || ''
    } else {
      body.connected_port = null
    }
  } else if (connectionMode.value === 'switch' && !selectedSwitchId.value) {
    body.connected_device = null
    body.connected_device_id = null
    body.connected_port_id = null
    body.connected_port = null
  } else {
    body.connected_device_id = null
    body.connected_port_id = null
  }

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/${props.port.id}`, {
      method: 'PUT',
      body
    })
    toast.add({ title: 'Port updated', color: 'green' })
    emit('saved')
    isOpen.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed', color: 'red' })
  }
}

async function resetPort() {
  try {
    await $fetch(`/api/switches/${props.switchId}/ports/${props.port.id}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Port reset to defaults', color: 'green' })
    emit('saved')
    isOpen.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Reset failed', color: 'red' })
  }
}
</script>
