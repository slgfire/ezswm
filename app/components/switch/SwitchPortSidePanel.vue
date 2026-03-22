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

        <UFormField :label="$t('common.status')">
          <USelect v-model="form.status" :items="['up', 'down', 'disabled']" />
        </UFormField>

        <UFormField :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :items="speeds" placeholder="Select speed" />
        </UFormField>

        <!-- Port Mode -->
        <UFormField :label="$t('switches.ports.portMode')">
          <USelect v-model="form.port_mode" :items="portModeOptions" />
        </UFormField>

        <!-- Access Mode: single VLAN -->
        <template v-if="form.port_mode === 'access'">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-model="form.access_vlan" :vlans="allVlans" />
          </UFormField>
        </template>

        <!-- Trunk Mode: native VLAN + tagged VLANs multi-select -->
        <template v-if="form.port_mode === 'trunk'">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-model="form.native_vlan" :vlans="allVlans" />
          </UFormField>

          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect
              v-if="allVlans.length"
              v-model="selectedTaggedVlans"
              :vlans="allVlans"
            />
            <UInput v-else v-model="taggedVlansStr" placeholder="e.g. 100,200,300" />
          </UFormField>
        </template>

        <!-- Connection Type -->
        <UFormField :label="$t('switches.ports.connectionType')">
          <div class="flex items-center gap-1">
            <button
              v-for="mode in connectionModes"
              :key="mode.value"
              class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
              :class="connectionMode === mode.value
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                : 'bg-gray-100 border-gray-300 text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
              @click="connectionMode = mode.value"
            >{{ mode.label }}</button>
          </div>
        </UFormField>

        <!-- Connected Switch -->
        <template v-if="connectionMode === 'switch'">
          <UFormField :label="$t('switches.ports.connectedSwitch')">
            <USelectMenu
              :model-value="selectedSwitchOption"
              :items="switchSearchOptions"
              searchable
              :searchable-placeholder="$t('switches.ports.searchSwitch')"
              option-attribute="label"
              by="value"
              @update:model-value="onSwitchSelect"
            >
              <template #label>
                <div v-if="selectedSwitchId" class="flex items-center gap-2">
                  <UIcon name="i-heroicons-server-stack" class="h-3.5 w-3.5 text-gray-400" />
                  <span>{{ switchSearchOptions.find(s => s.value === selectedSwitchId)?.label || selectedSwitchId }}</span>
                </div>
                <span v-else class="text-gray-400">—</span>
              </template>
              <template #option="{ option }">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-server-stack" class="h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <div class="font-medium">{{ option.sw?.name || '—' }}</div>
                    <div v-if="option.sw?.management_ip" class="font-mono text-xs text-gray-400">{{ option.sw.management_ip }}</div>
                  </div>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField v-if="selectedSwitchId" :label="$t('switches.ports.connectedPort')">
            <USelectMenu
              :model-value="selectedPortOption"
              :items="remotePortSearchOptions"
              searchable
              :searchable-placeholder="$t('switches.ports.searchPort')"
              option-attribute="label"
              by="value"
              @update:model-value="onPortSelect"
            >
              <template #label>
                <span v-if="selectedPortId">{{ selectedPortLabel }}</span>
                <span v-else class="text-gray-400">—</span>
              </template>
              <template #option="{ option }">
                <span>{{ option.label }}</span>
                <span v-if="option.connected" class="ml-1 text-xs text-yellow-400">({{ option.connected }})</span>
              </template>
            </USelectMenu>
            <!-- Port conflict warning -->
            <div v-if="portConflict" class="mt-1 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-400">
              <span class="font-semibold">{{ $t('common.warning') }}:</span> {{ $t('switches.ports.portConflict') }}
              <span class="font-medium text-yellow-300">{{ portConflict.device }} → {{ portConflict.port }}</span>.
              {{ $t('switches.ports.portConflictOverride') }}
            </div>
          </UFormField>
        </template>

        <!-- Connected Device (freetext with IP/hostname search) -->
        <template v-if="connectionMode === 'device'">
          <UFormField :label="$t('switches.ports.connectedDevice')">
            <USelectMenu
              :model-value="selectedDeviceOption"
              :items="deviceSearchOptions"
              searchable
              :searchable-placeholder="$t('switches.ports.searchDevice')"
              option-attribute="label"
              by="value"
              creatable
              @update:model-value="onDeviceSelect"
            >
              <template #label>
                <div v-if="form.connected_device" class="flex items-center gap-2">
                  <UIcon name="i-heroicons-computer-desktop" class="h-3.5 w-3.5 text-gray-400" />
                  <span>{{ form.connected_device }}</span>
                </div>
                <span v-else class="text-gray-400">—</span>
              </template>
              <template #option="{ option }">
                <div class="flex items-center gap-2">
                  <UIcon :name="option.icon || 'i-heroicons-computer-desktop'" class="h-3.5 w-3.5 text-gray-400" />
                  <div>
                    <div class="font-medium">{{ option.label }}</div>
                    <div v-if="option.detail" class="text-xs text-gray-400">{{ option.detail }}</div>
                  </div>
                </div>
              </template>
              <template #option-create="{ option }">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-plus" class="h-3.5 w-3.5 text-primary-400" />
                  <span>{{ option.label }}</span>
                </div>
              </template>
            </USelectMenu>
          </UFormField>

          <UFormField :label="$t('switches.ports.connectedPort')">
            <UInput v-model="form.connected_port" :placeholder="$t('switches.ports.portPlaceholder')" />
          </UFormField>
        </template>

        <!-- Freetext mode -->
        <template v-if="connectionMode === 'freetext'">
          <UFormField :label="$t('switches.ports.connectedDevice')">
            <UInput v-model="form.connected_device" :placeholder="$t('switches.ports.devicePlaceholder')" />
          </UFormField>
          <UFormField :label="$t('switches.ports.connectedPort')">
            <UInput v-model="form.connected_port" :placeholder="$t('switches.ports.portPlaceholder')" />
          </UFormField>
        </template>

        <UFormField :label="$t('common.description')">
          <UInput v-model="form.description" />
        </UFormField>

        <UFormField :label="$t('switches.ports.macAddress')">
          <UInput v-model="form.mac_address" placeholder="XX:XX:XX:XX:XX:XX" />
        </UFormField>
      </div>

      <!-- Port status prompt -->
      <div v-if="showSetUpPrompt" class="mx-4 mb-4 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
        <p class="text-sm text-primary-300 mb-2">
          {{ $t('switches.ports.portDownPrompt') }}
        </p>
        <div class="flex gap-2">
          <UButton size="xs" color="primary" @click="form.status = 'up'; showSetUpPrompt = false; save()">
            {{ $t('switches.ports.setToUp') }}
          </UButton>
          <UButton size="xs" variant="soft" color="gray" @click="showSetUpPrompt = false; save()">
            {{ $t('switches.ports.keepDown') }}
          </UButton>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton color="red" variant="soft" icon="i-heroicons-arrow-path" @click="resetPort">
            {{ $t('switches.ports.resetPort') }}
          </UButton>
          <div class="flex gap-2">
            <UButton variant="ghost" color="gray" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
            <UButton @click="onSaveClick">{{ $t('common.save') }}</UButton>
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
const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApiFetch()
const speeds = ['100M', '1G', '2.5G', '10G', '100G']

const portModeOptions = computed(() => [
  { label: t('switches.ports.modeAccess'), value: 'access' },
  { label: t('switches.ports.modeTrunk'), value: 'trunk' }
])

const connectionMode = ref<'switch' | 'device' | 'freetext'>('freetext')
const connectionModes = computed(() => [
  { label: t('switches.ports.connectedSwitch'), value: 'switch' },
  { label: t('switches.ports.connectedDevice'), value: 'device' },
  { label: t('switches.ports.freetext'), value: 'freetext' }
])
const selectedSwitchId = ref('')
const selectedPortId = ref('')
const allSwitches = ref<any[]>([])
const allVlans = ref<any[]>([])
const allAllocations = ref<any[]>([])
const selectedTaggedVlans = ref<number[]>([])
const loadingSwitches = ref(false)

const form = reactive({
  status: '',
  speed: '',
  port_mode: 'access' as string,
  access_vlan: null as number | null,
  native_vlan: null as number | null,
  connected_device: '',
  connected_port: '',
  description: '',
  mac_address: ''
})

const taggedVlansStr = ref('')

const vlanSelectOptions = computed(() => {
  return [
    { label: '— None —', value: '' },
    ...allVlans.value.map((v: any) => ({ label: `${v.vlan_id} · ${v.name}`, value: v.vlan_id }))
  ]
})

function toggleTaggedVlan(vlanId: number) {
  const idx = selectedTaggedVlans.value.indexOf(vlanId)
  if (idx >= 0) selectedTaggedVlans.value.splice(idx, 1)
  else selectedTaggedVlans.value.push(vlanId)
}

async function fetchSwitches() {
  loadingSwitches.value = true
  try {
    const data = await apiFetch<any>('/api/switches')
    allSwitches.value = data.data || data
  } catch { /* ignore */ }
  finally { loadingSwitches.value = false }
}

async function fetchVlans() {
  try {
    const data = await apiFetch<any>('/api/vlans')
    allVlans.value = (data.data || data).sort((a: any, b: any) => a.vlan_id - b.vlan_id)
  } catch { /* ignore */ }
}

async function fetchAllocations() {
  try {
    const data = await apiFetch<any>('/api/search', { params: { q: '*' } })
    allAllocations.value = data.allocations || []
  } catch {
    // Fallback: fetch all networks and their allocations
    try {
      const nets = await apiFetch<any>('/api/networks')
      const networkList = nets.data || nets || []
      const allocs: any[] = []
      for (const net of networkList) {
        try {
          const a = await apiFetch<any>(`/api/networks/${net.id}/allocations`)
          allocs.push(...(a.data || a || []))
        } catch { /* ignore */ }
      }
      allAllocations.value = allocs
    } catch { /* ignore */ }
  }
}

// Switch search options
const switchSearchOptions = computed(() => {
  return [
    { label: '—', value: '', sw: null },
    ...allSwitches.value.map(s => ({
      label: s.id === props.switchId ? `${s.name} (this switch)` : s.name,
      value: s.id,
      sw: s
    }))
  ]
})

const selectedSwitchOption = computed(() =>
  switchSearchOptions.value.find(o => o.value === selectedSwitchId.value) || switchSearchOptions.value[0]
)

function onSwitchSelect(option: any) {
  selectedSwitchId.value = option?.value || ''
  selectedPortId.value = ''
}

// Remote port search options
const remotePortSearchOptions = computed(() => {
  if (!selectedSwitchId.value) return []
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  if (!sw?.ports) return []
  return [
    { label: '—', value: '', connected: '' },
    ...sw.ports
      .filter((p: any) => {
        if (selectedSwitchId.value === props.switchId && p.id === props.port?.id) return false
        return true
      })
      .map((p: any) => {
        const label = p.label || `${p.unit}/${p.index}`
        const connected = (p.connected_device_id && !(p.connected_device_id === props.switchId && p.connected_port_id === props.port?.id))
          ? `→ ${p.connected_device}` : ''
        return { label, value: p.id, connected }
      })
  ]
})

const selectedPortOption = computed(() =>
  remotePortSearchOptions.value.find(o => o.value === selectedPortId.value) || null
)

function onPortSelect(option: any) {
  selectedPortId.value = option?.value || ''
}

// Device search options — combines IP allocations + freetext
const deviceSearchOptions = computed(() => {
  const options: any[] = [{ label: '—', value: '', icon: '', detail: '' }]
  // Add all known IP allocations
  for (const alloc of allAllocations.value) {
    const parts = [alloc.hostname, alloc.ip_address].filter(Boolean)
    options.push({
      label: alloc.hostname || alloc.ip_address,
      value: alloc.hostname || alloc.ip_address,
      icon: 'i-heroicons-server',
      detail: [alloc.ip_address, alloc.device_type, alloc.description].filter(Boolean).join(' · ')
    })
  }
  return options
})

const selectedDeviceOption = computed(() =>
  deviceSearchOptions.value.find(o => o.value === form.connected_device) || null
)

function onDeviceSelect(option: any) {
  if (typeof option === 'string') {
    // Creatable: user typed a new value
    form.connected_device = option
  } else {
    form.connected_device = option?.value || ''
  }
}

// Port conflict check
const portConflict = computed(() => {
  if (!selectedSwitchId.value || !selectedPortId.value) return null
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
  if (!port?.connected_device_id) return null
  if (port.connected_device_id === props.switchId && port.connected_port_id === props.port?.id) return null
  return { device: port.connected_device || 'Unknown', port: port.connected_port || 'Unknown port' }
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
    form.port_mode = p.port_mode || (p.tagged_vlans?.length ? 'trunk' : 'access')
    form.access_vlan = p.access_vlan || null
    form.native_vlan = p.native_vlan || null
    form.connected_device = p.connected_device || ''
    form.connected_port = p.connected_port || ''
    form.description = p.description || ''
    form.mac_address = p.mac_address || ''
    taggedVlansStr.value = (p.tagged_vlans || []).join(',')
    selectedTaggedVlans.value = [...(p.tagged_vlans || [])]

    if (p.connected_device_id) {
      connectionMode.value = 'switch'
      pendingSwitchId.value = p.connected_device_id
      pendingPortId.value = p.connected_port_id || ''
      if (allSwitches.value.length) {
        selectedSwitchId.value = p.connected_device_id
        selectedPortId.value = p.connected_port_id || ''
      }
    } else if (p.connected_device) {
      connectionMode.value = 'freetext'
      selectedSwitchId.value = ''
      selectedPortId.value = ''
      pendingSwitchId.value = ''
      pendingPortId.value = ''
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
    await Promise.all([fetchSwitches(), fetchVlans(), fetchAllocations()])
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
  const tagged_vlans = allVlans.value.length
    ? [...selectedTaggedVlans.value]
    : taggedVlansStr.value
    ? taggedVlansStr.value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
    : []

  const body: Record<string, any> = {
    ...form,
    tagged_vlans
  }

  // Access mode: clear trunk fields
  if (form.port_mode === 'access') {
    body.native_vlan = null
    body.tagged_vlans = []
  }
  // Trunk mode: clear access field
  if (form.port_mode === 'trunk') {
    body.access_vlan = null
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
    toast.add({ title: t('switches.ports.portUpdated'), color: 'green' })
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
    toast.add({ title: t('switches.ports.portReset'), color: 'green' })
    emit('saved')
    isOpen.value = false
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Reset failed', color: 'red' })
  }
}
</script>
