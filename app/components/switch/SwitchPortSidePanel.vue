<template>
  <USlideover v-model:open="isOpen" :title="port?.label || `Port ${port?.unit}/${port?.index}`" description="Edit port configuration">

    <template #body>
      <div v-if="port" class="space-y-4">
        <div class="flex gap-2">
          <UBadge>{{ port.type }}</UBadge>
          <UBadge :color="port.status === 'up' ? 'success' : port.status === 'disabled' ? 'error' : 'neutral'">{{ port.status }}</UBadge>
        </div>

        <UFormField :label="$t('common.status')">
          <USelect v-model="form.status" :items="['up', 'down', 'disabled']" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :items="speeds" placeholder="Select speed" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.portMode')">
          <USelect v-model="form.port_mode" :items="portModeOptions" class="w-full" />
        </UFormField>

        <template v-if="form.port_mode === 'access'">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-model="form.access_vlan" :vlans="allVlans" />
          </UFormField>
        </template>

        <template v-if="form.port_mode === 'trunk'">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-model="form.native_vlan" :vlans="allVlans" />
          </UFormField>
          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect v-if="allVlans.length" v-model="selectedTaggedVlans" :vlans="allVlans" />
            <UInput v-else v-model="taggedVlansStr" placeholder="e.g. 100,200,300" class="w-full" />
          </UFormField>
        </template>

        <UFormField :label="$t('switches.ports.connectionType')">
          <div class="flex items-center gap-1">
            <button
              v-for="mode in connectionModes"
              :key="mode.value"
              class="px-2.5 py-1 text-xs font-medium rounded border transition-colors"
              :class="connectionMode === mode.value
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'"
              @click="connectionMode = mode.value"
            >{{ mode.label }}</button>
          </div>
        </UFormField>

        <template v-if="connectionMode === 'switch'">
          <UFormField :label="$t('switches.ports.connectedSwitch')">
            <USelectMenu
              :search-input="false"
              :model-value="selectedSwitchOption"
              :items="switchSearchOptions"

              by="value"
              @update:model-value="onSwitchSelect"
              class="w-full"
            />
          </UFormField>
          <UFormField v-if="selectedSwitchId" :label="$t('switches.ports.connectedPort')">
            <USelectMenu
              :search-input="false"
              :model-value="selectedPortOption"
              :items="remotePortSearchOptions"

              by="value"
              @update:model-value="onPortSelect"
              class="w-full"
            />
            <div v-if="portConflict" class="mt-1 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-400">
              <span class="font-semibold">{{ $t('common.warning') }}:</span> {{ $t('switches.ports.portConflict') }}
              <span class="font-medium text-yellow-300">{{ portConflict.device }} → {{ portConflict.port }}</span>.
              {{ $t('switches.ports.portConflictOverride') }}
            </div>
          </UFormField>
        </template>

        <template v-if="connectionMode === 'device'">
          <UFormField :label="$t('switches.ports.connectedDevice')">
            <UInput v-model="form.connected_device" :placeholder="$t('switches.ports.devicePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('switches.ports.connectedPort')">
            <UInput v-model="form.connected_port" :placeholder="$t('switches.ports.portPlaceholder')" class="w-full" />
          </UFormField>
        </template>

        <template v-if="connectionMode === 'freetext'">
          <UFormField :label="$t('switches.ports.connectedDevice')">
            <UInput v-model="form.connected_device" :placeholder="$t('switches.ports.devicePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('switches.ports.connectedPort')">
            <UInput v-model="form.connected_port" :placeholder="$t('switches.ports.portPlaceholder')" class="w-full" />
          </UFormField>
        </template>

        <UFormField :label="$t('common.description')">
          <UInput v-model="form.description" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.macAddress')">
          <UInput v-model="form.mac_address" placeholder="XX:XX:XX:XX:XX:XX" class="w-full" />
        </UFormField>
      </div>

      <div v-if="showSetUpPrompt" class="mt-4 rounded-lg border border-primary-500/30 bg-primary-500/10 p-3">
        <p class="text-sm text-primary-300 mb-2">{{ $t('switches.ports.portDownPrompt') }}</p>
        <div class="flex gap-2">
          <UButton size="xs" color="primary" @click="form.status = 'up'; showSetUpPrompt = false; save()">{{ $t('switches.ports.setToUp') }}</UButton>
          <UButton size="xs" variant="soft" color="neutral" @click="showSetUpPrompt = false; save()">{{ $t('switches.ports.keepDown') }}</UButton>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <UButton color="error" variant="soft" icon="i-heroicons-arrow-path" @click="resetPort">{{ $t('switches.ports.resetPort') }}</UButton>
        <div class="flex gap-2">
          <UButton variant="ghost" color="neutral" @click="isOpen = false">{{ $t('common.cancel') }}</UButton>
          <UButton @click="onSaveClick">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
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

async function fetchSwitches() {
  try { const data = await apiFetch<any>('/api/switches'); allSwitches.value = data.data || data } catch { /* ignore */ }
}

async function fetchVlans() {
  try { const data = await apiFetch<any>('/api/vlans'); allVlans.value = (data.data || data).sort((a: any, b: any) => a.vlan_id - b.vlan_id) } catch { /* ignore */ }
}

async function fetchAllocations() {
  try {
    const nets = await apiFetch<any>('/api/networks')
    const networkList = nets.data || nets || []
    const allocs: any[] = []
    for (const net of networkList) {
      try { const a = await apiFetch<any>(`/api/networks/${net.id}/allocations`); allocs.push(...(a.data || a || [])) } catch { /* ignore */ }
    }
    allAllocations.value = allocs
  } catch { /* ignore */ }
}

const switchSearchOptions = computed(() => [
  { label: '—', value: '', sw: null },
  ...allSwitches.value.map(s => ({ label: s.id === props.switchId ? `${s.name} (this switch)` : s.name, value: s.id, sw: s }))
])

const selectedSwitchOption = computed(() => switchSearchOptions.value.find(o => o.value === selectedSwitchId.value) || switchSearchOptions.value[0])
function onSwitchSelect(option: any) { selectedSwitchId.value = option?.value || ''; selectedPortId.value = '' }

const remotePortSearchOptions = computed(() => {
  if (!selectedSwitchId.value) return []
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  if (!sw?.ports) return []
  return [
    { label: '—', value: '', connected: '' },
    ...sw.ports.filter((p: any) => !(selectedSwitchId.value === props.switchId && p.id === props.port?.id))
      .map((p: any) => {
        const label = p.label || `${p.unit}/${p.index}`
        const connected = (p.connected_device_id && !(p.connected_device_id === props.switchId && p.connected_port_id === props.port?.id)) ? `→ ${p.connected_device}` : ''
        return { label, value: p.id, connected }
      })
  ]
})

const selectedPortOption = computed(() => remotePortSearchOptions.value.find(o => o.value === selectedPortId.value) || null)
function onPortSelect(option: any) { selectedPortId.value = option?.value || '' }

const selectedPortLabel = computed(() => {
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
  return port?.label || `${port?.unit}/${port?.index}` || selectedPortId.value
})

const portConflict = computed(() => {
  if (!selectedSwitchId.value || !selectedPortId.value) return null
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value)
  if (!port?.connected_device_id) return null
  if (port.connected_device_id === props.switchId && port.connected_port_id === props.port?.id) return null
  return { device: port.connected_device || 'Unknown', port: port.connected_port || 'Unknown port' }
})

const pendingSwitchId = ref('')
const pendingPortId = ref('')

watch(() => props.port, (p) => {
  if (p) {
    form.status = p.status; form.speed = p.speed || ''; form.port_mode = p.port_mode || (p.tagged_vlans?.length ? 'trunk' : 'access')
    form.access_vlan = p.access_vlan || null; form.native_vlan = p.native_vlan || null
    form.connected_device = p.connected_device || ''; form.connected_port = p.connected_port || ''
    form.description = p.description || ''; form.mac_address = p.mac_address || ''
    taggedVlansStr.value = (p.tagged_vlans || []).join(','); selectedTaggedVlans.value = [...(p.tagged_vlans || [])]
    if (p.connected_device_id) {
      connectionMode.value = 'switch'; pendingSwitchId.value = p.connected_device_id; pendingPortId.value = p.connected_port_id || ''
      if (allSwitches.value.length) { selectedSwitchId.value = p.connected_device_id; selectedPortId.value = p.connected_port_id || '' }
    } else {
      connectionMode.value = 'freetext'; selectedSwitchId.value = ''; selectedPortId.value = ''; pendingSwitchId.value = ''; pendingPortId.value = ''
    }
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (open) {
    await Promise.all([fetchSwitches(), fetchVlans(), fetchAllocations()])
    if (pendingSwitchId.value) { selectedSwitchId.value = pendingSwitchId.value; selectedPortId.value = pendingPortId.value }
  }
})

watch(selectedSwitchId, (newVal, oldVal) => { if (oldVal && newVal !== oldVal) selectedPortId.value = '' })

const showSetUpPrompt = ref(false)

async function onSaveClick() {
  if (connectionMode.value === 'switch' && selectedSwitchId.value && selectedPortId.value && form.status === 'down') { showSetUpPrompt.value = true; return }
  await save()
}

async function save() {
  const tagged_vlans = allVlans.value.length ? [...selectedTaggedVlans.value] : taggedVlansStr.value ? taggedVlansStr.value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v)) : []
  const body: Record<string, any> = { ...form, tagged_vlans }
  if (form.port_mode === 'access') { body.native_vlan = null; body.tagged_vlans = [] }
  if (form.port_mode === 'trunk') { body.access_vlan = null }
  if (connectionMode.value === 'switch' && selectedSwitchId.value) {
    const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
    body.connected_device = sw?.name || ''; body.connected_device_id = selectedSwitchId.value; body.connected_port_id = selectedPortId.value || null
    if (selectedPortId.value) { const port = sw?.ports?.find((p: any) => p.id === selectedPortId.value); body.connected_port = port?.label || '' } else { body.connected_port = null }
  } else if (connectionMode.value === 'switch') {
    body.connected_device = null; body.connected_device_id = null; body.connected_port_id = null; body.connected_port = null
  } else { body.connected_device_id = null; body.connected_port_id = null }
  try {
    await $fetch(`/api/switches/${props.switchId}/ports/${props.port.id}`, { method: 'PUT', body })
    toast.add({ title: t('switches.ports.portUpdated'), color: 'success' }); emit('saved'); isOpen.value = false
  } catch (e: any) { toast.add({ title: e.data?.message || 'Failed', color: 'error' }) }
}

async function resetPort() {
  try {
    await $fetch(`/api/switches/${props.switchId}/ports/${props.port.id}`, { method: 'DELETE' })
    toast.add({ title: t('switches.ports.portReset'), color: 'success' }); emit('saved'); isOpen.value = false
  } catch (e: any) { toast.add({ title: e.data?.message || 'Reset failed', color: 'error' }) }
}
</script>
