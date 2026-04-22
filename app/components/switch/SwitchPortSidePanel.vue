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

        <div v-if="allVlans.length > 0 && configuredVlans" class="flex items-center gap-2 mb-3">
          <USwitch v-model="addVlansToSwitch" size="xs" />
          <span class="text-xs text-dimmed">{{ $t('vlans.addToSwitchToggle') }}</span>
        </div>

        <template v-if="form.port_mode === 'access'">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-model="form.access_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :override-active="addVlansToSwitch" />
          </UFormField>
        </template>

        <template v-if="form.port_mode === 'trunk'">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-model="form.native_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :override-active="addVlansToSwitch" />
          </UFormField>
          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect v-if="allVlans.length" v-model="selectedTaggedVlans" :vlans="allVlans" :configured-vlans="configuredVlans" :override-active="addVlansToSwitch" />
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
              class="w-full"
              @update:model-value="onSwitchSelect"
            />
          </UFormField>
          <UFormField v-if="selectedSwitchId" :label="$t('switches.ports.connectedPort')">
            <USelectMenu
              :search-input="false"
              :model-value="selectedPortOption"
              :items="remotePortSearchOptions"

              by="value"
              class="w-full"
              @update:model-value="onPortSelect"
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
            <div v-if="deviceHint" class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              {{ deviceHint }}
            </div>
            <USelectMenu
              v-else
              v-model="selectedAllocationOption"
              :items="allocationOptions"
              by="value"
              :placeholder="$t('switches.ports.selectDevice')"
              class="w-full"
              @update:model-value="onAllocationSelect"
            />
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

        <UFormField v-if="port?.type === 'rj45'" :label="$t('templates.poe')">
          <USelect
            v-model="form.poe_selection"
            :items="poeOptions"
            :placeholder="$t('templates.poeNone')"
            class="w-full"
          />
        </UFormField>

        <!-- Helper View Settings -->
        <div class="border-t border-default pt-4 mt-4">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            {{ $t('helperUsage.helperSection') }}
          </h4>

          <UFormField :label="$t('helperUsage.label')" name="helper_usage" class="mb-3">
            <USelect v-model="form.helper_usage" :items="helperUsageOptions" class="w-full" />
          </UFormField>

          <UFormField :label="$t('helperUsage.helperLabel')" name="helper_label" class="mb-3">
            <UInput v-model="form.helper_label" :placeholder="$t('helperUsage.helperLabelPlaceholder')" class="w-full" />
          </UFormField>

          <UFormField name="show_in_helper_list">
            <UCheckbox v-model="form.show_in_helper_list" :label="$t('helperUsage.showInHelperList')" />
          </UFormField>
        </div>

        <USeparator />

        <UFormField :label="$t('lag.group')">
          <div v-if="lagGroup" class="flex items-center gap-2">
            <UBadge color="info" variant="soft" size="sm">{{ lagGroup.name }}</UBadge>
            <span v-if="lagGroup.remote_device" class="text-xs text-gray-400">→ {{ lagGroup.remote_device }}</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              @click="onRemoveFromLag"
            >
              {{ $t('lag.removeFromLag') }}
            </UButton>
          </div>
          <span v-else class="text-sm text-gray-400">{{ $t('common.none') }}</span>
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
import type { Port } from '~~/types/port'
import type { VLAN } from '~~/types/vlan'
import type { Switch } from '~~/types/switch'
import type { Network } from '~~/types/network'
import type { IPAllocation } from '~~/types/ipAllocation'
import type { LAGGroup } from '~~/types/lagGroup'

const props = defineProps<{
  port: Port | null
  switchId: string
  lagGroup?: LAGGroup
  configuredVlans?: number[]
  switchUpdatedAt?: string
}>()

const emit = defineEmits<{
  saved: []
  'remove-from-lag': [lagId: string, portId: string]
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
  { label: t('switches.ports.connectedSwitch'), value: 'switch' as const },
  { label: t('switches.ports.connectedDevice'), value: 'device' as const },
  { label: t('switches.ports.freetext'), value: 'freetext' as const }
])
const selectedSwitchId = ref('')
const selectedPortId = ref('')
const allSwitches = ref<Switch[]>([])
const allVlans = ref<VLAN[]>([])
const allAllocations = ref<IPAllocation[]>([])
const allNetworks = ref<Network[]>([])
const selectedAllocationId = ref<string>('')
const selectedTaggedVlans = ref<number[]>([])
const addVlansToSwitch = ref(false)

const poeOptions = computed(() => [
  { label: '802.3af (15.4W)', value: '802.3af' },
  { label: '802.3at (30W)', value: '802.3at' },
  { label: '802.3bt Type 3 (60W)', value: '802.3bt-type3' },
  { label: '802.3bt Type 4 (100W)', value: '802.3bt-type4' },
  { label: 'Passive 24V', value: 'passive-24v' },
  { label: 'Passive 48V', value: 'passive-48v' },
])

const POE_WATTS: Record<string, number> = {
  '802.3af': 15.4, '802.3at': 30, '802.3bt-type3': 60,
  '802.3bt-type4': 100, 'passive-24v': 24, 'passive-48v': 48,
}

const form = reactive({
  status: '',
  speed: '',
  port_mode: 'access' as string,
  access_vlan: null as number | null,
  native_vlan: null as number | null,
  connected_device: '',
  connected_port: '',
  description: '',
  mac_address: '',
  poe_selection: '' as string,
  helper_usage: '' as string,
  helper_label: '',
  show_in_helper_list: true
})

const helperUsageOptions = computed(() => [
  { value: '_automatic', label: t('helperUsage.automatic') },
  { value: 'participant', label: t('helperUsage.participant') },
  { value: 'phone_passthrough', label: t('helperUsage.phone_passthrough') },
  { value: 'ap', label: t('helperUsage.ap') },
  { value: 'printer', label: t('helperUsage.printer') },
  { value: 'orga', label: t('helperUsage.orga') },
  { value: 'uplink', label: t('helperUsage.uplink') },
])

const taggedVlansStr = ref('')

async function fetchSwitches() {
  try { const data = await apiFetch<{ data?: Switch[] } | Switch[]>('/api/switches'); allSwitches.value = (Array.isArray(data) ? data : data.data) || [] } catch { /* ignore */ }
}

async function fetchVlans() {
  try {
    const route = useRoute()
    const siteId = route.params.siteId as string
    const params: Record<string, string> = {}
    if (siteId && siteId !== 'all') params.site_id = siteId
    const data = await apiFetch<{ data?: VLAN[] } | VLAN[]>('/api/vlans', { params })
    allVlans.value = (Array.isArray(data) ? data : data.data || []).sort((a: VLAN, b: VLAN) => a.vlan_id - b.vlan_id)
  } catch { /* ignore */ }
}

async function fetchAllocations() {
  try {
    const route = useRoute()
    const siteId = route.params.siteId as string
    const params: Record<string, string> = {}
    if (siteId && siteId !== 'all') params.site_id = siteId

    // Fetch all networks (paged)
    const allNets: Network[] = []
    let netPage = 1
    while (true) {
      const res = await apiFetch<{ data?: Network[]; items?: Network[] } | Network[]>('/api/networks', { params: { ...params, page: netPage, per_page: 100 } })
      const items = Array.isArray(res) ? res : (res.data || res.items || [])
      if (!Array.isArray(items) || items.length === 0) break
      allNets.push(...items)
      if (items.length < 100) break
      netPage++
    }
    allNetworks.value = allNets

    // Fetch allocations from all networks in parallel
    const allocResults = await Promise.all(
      allNets.map(async (net) => {
        const allocs: IPAllocation[] = []
        let page = 1
        while (true) {
          try {
            const a = await apiFetch<{ data?: IPAllocation[] } | IPAllocation[]>(`/api/networks/${net.id}/allocations`, { params: { page, per_page: 100 } })
            const items = Array.isArray(a) ? a : (a.data || [])
            if (!Array.isArray(items) || items.length === 0) break
            allocs.push(...items)
            if (items.length < 100) break
            page++
          } catch { break }
        }
        return allocs
      })
    )
    // Deduplicate by id
    const seen = new Set<string>()
    const allocs: IPAllocation[] = []
    for (const batch of allocResults) {
      for (const a of batch) {
        if (!seen.has(a.id)) { seen.add(a.id); allocs.push(a) }
      }
    }
    allAllocations.value = allocs
  } catch { /* ignore */ }
}

const switchSearchOptions = computed(() => [
  { label: '—', value: '', sw: null as Switch | null },
  ...allSwitches.value.map(s => ({ label: s.id === props.switchId ? `${s.name} (this switch)` : s.name, value: s.id, sw: s as Switch | null }))
])

const selectedSwitchOption = computed(() => switchSearchOptions.value.find(o => o.value === selectedSwitchId.value) || switchSearchOptions.value[0])
function onSwitchSelect(option: { label: string; value: string; sw: Switch | null } | undefined) { selectedSwitchId.value = option?.value || ''; selectedPortId.value = '' }

const remotePortSearchOptions = computed(() => {
  if (!selectedSwitchId.value) return []
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  if (!sw?.ports) return []
  return [
    { label: '—', value: '', connected: '' },
    ...sw.ports.filter((p: Port) => !(selectedSwitchId.value === props.switchId && p.id === props.port?.id))
      .map((p: Port) => {
        const label = p.label || `${p.unit}/${p.index}`
        const connected = (p.connected_device_id && !(p.connected_device_id === props.switchId && p.connected_port_id === props.port?.id))
          ? `→ ${p.connected_device}`
          : p.connected_allocation_id
            ? `→ ${p.connected_device || 'Device'}`
            : ''
        return { label, value: p.id, connected }
      })
  ]
})

const selectedPortOption = computed(() => remotePortSearchOptions.value.find(o => o.value === selectedPortId.value) || undefined)
function onPortSelect(option: { label: string; value: string; connected: string } | undefined) { selectedPortId.value = option?.value || '' }


const portConflict = computed(() => {
  if (!selectedSwitchId.value || !selectedPortId.value) return null
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  const port = sw?.ports?.find((p: Port) => p.id === selectedPortId.value)
  if (port?.connected_allocation_id) {
    return { device: port.connected_device || 'Device', port: port.connected_port || '' }
  }
  if (!port?.connected_device_id) return null
  if (port.connected_device_id === props.switchId && port.connected_port_id === props.port?.id) return null
  return { device: port.connected_device || 'Unknown', port: port.connected_port || 'Unknown port' }
})

// VLANs from form state, respecting port_mode
const formVlanNumbers = computed(() => {
  const vlans: number[] = []
  if (form.port_mode === 'trunk') {
    if (form.native_vlan) vlans.push(form.native_vlan)
    if (selectedTaggedVlans.value.length) vlans.push(...selectedTaggedVlans.value)
  } else {
    if (form.access_vlan) vlans.push(form.access_vlan)
  }
  return [...new Set(vlans)]
})

const formVlanUuids = computed(() => {
  return formVlanNumbers.value
    .map(num => allVlans.value.find((v) => v.vlan_id === num))
    .filter((v): v is VLAN => !!v)
    .map((v) => v.id)
})

const formNetworks = computed(() => {
  if (!formVlanUuids.value.length) return []
  return allNetworks.value.filter((n) => n.vlan_id && formVlanUuids.value.includes(n.vlan_id))
})

const filteredAllocations = computed(() => {
  if (!formNetworks.value.length) return []
  const networkIds = new Set(formNetworks.value.map((n) => n.id))
  return allAllocations.value.filter((a) => networkIds.has(a.network_id))
})

// Dropdown options with None, grouping, stale handling, sorted by IP
const allocationOptions = computed(() => {
  const options: { label: string; value: string; allocation: IPAllocation | null }[] = [
    { label: '— ' + t('common.none') + ' —', value: '', allocation: null }
  ]

  for (const net of formNetworks.value) {
    const netAllocs = filteredAllocations.value
      .filter((a) => a.network_id === net.id)
      .sort((a, b) => {
        // Sort by IP numerically
        const aParts = a.ip_address.split('.').map(Number)
        const bParts = b.ip_address.split('.').map(Number)
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i]! - bParts[i]!
        }
        return 0
      })
    const prefix = formNetworks.value.length > 1 ? `[${net.name} ${net.subnet || ''}] ` : ''
    for (const a of netAllocs) {
      options.push({
        label: prefix + (a.hostname ? `${a.hostname} (${a.ip_address})` : a.ip_address),
        value: a.id,
        allocation: a,
      })
    }
  }

  // Stale: selected allocation not in filtered list
  if (selectedAllocationId.value && !options.find(o => o.value === selectedAllocationId.value)) {
    const stale = allAllocations.value.find((a) => a.id === selectedAllocationId.value)
    if (stale) {
      options.splice(1, 0, {
        label: `${stale.hostname ? `${stale.hostname} (${stale.ip_address})` : stale.ip_address} ⚠`,
        value: stale.id,
        allocation: stale,
      })
    } else if (form.connected_device) {
      options.splice(1, 0, {
        label: `${form.connected_device} (stale)`,
        value: selectedAllocationId.value,
        allocation: null,
      })
    }
  }

  return options
})

const selectedAllocationOption = computed(() => {
  if (!selectedAllocationId.value) return allocationOptions.value[0]
  return allocationOptions.value.find(o => o.value === selectedAllocationId.value) || allocationOptions.value[0]
})

const deviceHint = computed(() => {
  if (formVlanNumbers.value.length === 0) return t('switches.ports.deviceHintNoVlan')
  if (formNetworks.value.length === 0) return t('switches.ports.deviceHintNoNetwork')
  if (filteredAllocations.value.length === 0 && !selectedAllocationId.value) return t('switches.ports.deviceHintNoDevices')
  return ''
})

function onAllocationSelect(option: { label: string; value: string; allocation: IPAllocation | null } | undefined) {
  selectedAllocationId.value = option?.value || ''
  if (option?.allocation) {
    const a = option.allocation
    form.connected_device = a.hostname ? `${a.hostname} (${a.ip_address})` : a.ip_address
    form.connected_port = ''
  } else {
    form.connected_device = ''
    form.connected_port = ''
  }
}

const pendingSwitchId = ref('')
const pendingPortId = ref('')

let isRehydrating = true

watch(connectionMode, (newMode, oldMode) => {
  if (newMode === oldMode || isRehydrating) return
  if (oldMode === 'device') {
    selectedAllocationId.value = ''
    form.connected_device = ''
    form.connected_port = ''
  }
  if (oldMode === 'switch') {
    selectedSwitchId.value = ''
    selectedPortId.value = ''
    form.connected_device = ''
    form.connected_port = ''
  }
  if (oldMode === 'freetext') {
    form.connected_device = ''
    form.connected_port = ''
  }
})

watch(() => props.port, (p) => {
  if (p) {
    form.status = p.status; form.speed = p.speed || ''; form.port_mode = p.port_mode || (p.tagged_vlans?.length ? 'trunk' : 'access')
    form.access_vlan = p.access_vlan || null; form.native_vlan = p.native_vlan || null
    form.connected_device = p.connected_device || ''; form.connected_port = p.connected_port || ''
    form.description = p.description || ''; form.mac_address = p.mac_address || ''
    form.poe_selection = p.poe?.type || ''
    form.helper_usage = p.helper_usage || '_automatic'
    form.helper_label = p.helper_label || ''
    form.show_in_helper_list = p.show_in_helper_list ?? true
    taggedVlansStr.value = (p.tagged_vlans || []).join(','); selectedTaggedVlans.value = [...(p.tagged_vlans || [])]
    isRehydrating = true
    if (p.connected_allocation_id) {
      connectionMode.value = 'device'
      selectedAllocationId.value = p.connected_allocation_id
      selectedSwitchId.value = ''
      selectedPortId.value = ''
      pendingSwitchId.value = ''
      pendingPortId.value = ''
    } else if (p.connected_device_id) {
      connectionMode.value = 'switch'
      selectedAllocationId.value = ''
      pendingSwitchId.value = p.connected_device_id
      pendingPortId.value = p.connected_port_id || ''
      if (allSwitches.value.length) {
        selectedSwitchId.value = p.connected_device_id
        selectedPortId.value = p.connected_port_id || ''
      }
    } else {
      connectionMode.value = 'freetext'
      selectedAllocationId.value = ''
      selectedSwitchId.value = ''
      selectedPortId.value = ''
      pendingSwitchId.value = ''
      pendingPortId.value = ''
    }
    nextTick(() => { isRehydrating = false })
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (open) {
    addVlansToSwitch.value = false
    // Re-load form state from port data to discard any unsaved changes
    const p = props.port
    if (p) {
      isRehydrating = true
      form.status = p.status; form.speed = p.speed || ''; form.port_mode = p.port_mode || (p.tagged_vlans?.length ? 'trunk' : 'access')
      form.access_vlan = p.access_vlan || null; form.native_vlan = p.native_vlan || null
      form.connected_device = p.connected_device || ''; form.connected_port = p.connected_port || ''
      form.description = p.description || ''; form.mac_address = p.mac_address || ''
      form.poe_selection = p.poe?.type || ''
      form.helper_usage = p.helper_usage || '_automatic'
      form.helper_label = p.helper_label || ''
      form.show_in_helper_list = p.show_in_helper_list ?? true
      taggedVlansStr.value = (p.tagged_vlans || []).join(','); selectedTaggedVlans.value = [...(p.tagged_vlans || [])]
      if (p.connected_allocation_id) {
        connectionMode.value = 'device'
        selectedAllocationId.value = p.connected_allocation_id
        selectedSwitchId.value = ''; selectedPortId.value = ''; pendingSwitchId.value = ''; pendingPortId.value = ''
      } else if (p.connected_device_id) {
        connectionMode.value = 'switch'
        selectedAllocationId.value = ''
        pendingSwitchId.value = p.connected_device_id; pendingPortId.value = p.connected_port_id || ''
      } else {
        connectionMode.value = 'freetext'
        selectedAllocationId.value = ''; selectedSwitchId.value = ''; selectedPortId.value = ''; pendingSwitchId.value = ''; pendingPortId.value = ''
      }
      nextTick(() => { isRehydrating = false })
    }
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
  const body: Record<string, unknown> = { ...form, tagged_vlans }
  body.poe = form.poe_selection ? { type: form.poe_selection, max_watts: POE_WATTS[form.poe_selection] } : null
  delete body.poe_selection
  body.helper_usage = form.helper_usage === '_automatic' ? null : (form.helper_usage || null)
  body.helper_label = form.helper_label || null
  body.show_in_helper_list = form.show_in_helper_list
  if (form.port_mode === 'access') { body.native_vlan = null; body.tagged_vlans = [] }
  if (form.port_mode === 'trunk') { body.access_vlan = null }
  // Set connected_allocation_id based on mode
  if (connectionMode.value === 'device') {
    body.connected_allocation_id = selectedAllocationId.value || null
    body.connected_device_id = null
    body.connected_port_id = null
    body.connected_port = null
    if (!selectedAllocationId.value) {
      body.connected_device = null
    }
  } else {
    body.connected_allocation_id = null
  }
  if (addVlansToSwitch.value) body.add_vlans_to_switch = true
  if (props.switchUpdatedAt) body.expected_updated_at = props.switchUpdatedAt
  if (connectionMode.value === 'switch' && selectedSwitchId.value) {
    const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
    body.connected_device = sw?.name || ''; body.connected_device_id = selectedSwitchId.value; body.connected_port_id = selectedPortId.value || null
    if (selectedPortId.value) { const port = sw?.ports?.find((p: Port) => p.id === selectedPortId.value); body.connected_port = port?.label || '' } else { body.connected_port = null }
  } else if (connectionMode.value === 'switch') {
    body.connected_device = null; body.connected_device_id = null; body.connected_port_id = null; body.connected_port = null
  } else { body.connected_device_id = null; body.connected_port_id = null }
  try {
    const response = await $fetch<Record<string, unknown>>(`/api/switches/${props.switchId}/ports/${props.port!.id}`, { method: 'PUT', body })

    if ((response as any)?.vlans_added_to_switch?.length) {
      toast.add({ title: t('vlans.addedToSwitch', { id: (response as any).vlans_added_to_switch.join(', ') }) })
    }
    addVlansToSwitch.value = false

    // LAG sync: update VLAN/speed/status/connected_device on all other LAG member ports
    if ((props.lagGroup?.port_ids?.length ?? 0) > 1) {
      const syncFields: Record<string, unknown> = {
        status: body.status,
        speed: body.speed,
        port_mode: body.port_mode,
        access_vlan: body.access_vlan,
        native_vlan: body.native_vlan,
        tagged_vlans: body.tagged_vlans,
        connected_device: body.connected_device,
        connected_device_id: body.connected_device_id,
        connected_allocation_id: body.connected_allocation_id,
      }
      if (body.connected_allocation_id) {
        syncFields.connected_port = null
      }
      const otherPortIds = props.lagGroup!.port_ids!.filter((pid: string) => pid !== props.port!.id)
      for (const portId of otherPortIds) {
        try {
          await $fetch(`/api/switches/${props.switchId}/ports/${portId}`, { method: 'PUT', body: syncFields })
        } catch { /* best-effort sync */ }
      }
      toast.add({ title: t('switches.ports.portUpdated') + ` (${otherPortIds.length + 1} LAG ports)`, color: 'success' })
    } else {
      toast.add({ title: t('switches.ports.portUpdated'), color: 'success' })
    }

    emit('saved'); isOpen.value = false
  } catch (e: unknown) { const err = e as { data?: { message?: string } }; toast.add({ title: err.data?.message || 'Failed', color: 'error' }) }
}

function onRemoveFromLag() {
  if (!props.lagGroup || !props.port) return
  emit('remove-from-lag', props.lagGroup.id, props.port!.id)
}

async function resetPort() {
  try {
    await ($fetch as typeof globalThis.fetch)(`/api/switches/${props.switchId}/ports/${props.port!.id}`, { method: 'DELETE' })
    toast.add({ title: t('switches.ports.portReset'), color: 'success' }); emit('saved'); isOpen.value = false
  } catch (e: unknown) { const err = e as { data?: { message?: string } }; toast.add({ title: err.data?.message || 'Reset failed', color: 'error' }) }
}
</script>
