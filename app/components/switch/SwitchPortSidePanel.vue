<template>
  <USlideover :open="isOpen" :title="port?.label || `Port ${port?.unit}/${port?.index}`" :description="readonly ? $t('permissions.viewOnly') : 'Edit port configuration'" @update:open="onOpenChange">

    <template #body>
      <div v-if="port && readonly" class="space-y-5">
        <div class="rounded-xl border border-primary-500/20 bg-primary-500/[0.06] p-4">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="soft">{{ port.type }}</UBadge>
            <UBadge :color="port.status === 'up' ? 'success' : port.status === 'disabled' ? 'error' : 'neutral'" variant="subtle">{{ port.status }}</UBadge>
            <UBadge v-if="port.poe?.type && port.poe.type !== 'disabled'" color="warning" variant="subtle">PoE · {{ port.poe.type }}</UBadge>
          </div>
          <p class="mt-2 text-xs text-muted">{{ $t('permissions.viewOnly') }}</p>
        </div>

        <dl class="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-default bg-elevated/30 p-4 text-sm">
          <div><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.speed') }}</dt><dd class="mt-1 font-medium">{{ port.speed || '—' }}</dd></div>
          <div><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.portMode') }}</dt><dd class="mt-1 font-medium">{{ port.port_mode || (port.tagged_vlans?.length ? 'trunk' : 'access') }}</dd></div>
          <div v-if="port.port_mode === 'trunk' || port.tagged_vlans?.length" class="col-span-2">
            <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.nativeVlan') }} / {{ $t('switches.ports.taggedVlans') }}</dt>
            <dd class="mt-1 flex flex-wrap gap-1.5">
              <UBadge v-if="port.native_vlan" color="primary" variant="soft">{{ vlanLabel(port.native_vlan) }} · native</UBadge>
              <UBadge v-for="vid in port.tagged_vlans || []" :key="vid" color="neutral" variant="subtle">{{ vlanLabel(vid) }}</UBadge>
              <span v-if="!port.native_vlan && !port.tagged_vlans?.length" class="text-muted">—</span>
            </dd>
          </div>
          <div v-else class="col-span-2"><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.accessVlan') }}</dt><dd class="mt-1"><UBadge v-if="port.access_vlan" color="primary" variant="soft">{{ vlanLabel(port.access_vlan) }}</UBadge><span v-else class="text-muted">—</span></dd></div>
          <div class="col-span-2"><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.connectedDevice') }}</dt><dd class="mt-1 font-medium">{{ port.connected_device || lagGroup?.remote_device || '—' }}</dd></div>
          <div><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.connectedPort') }}</dt><dd class="mt-1 font-mono">{{ port.connected_port || '—' }}</dd></div>
          <div><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('switches.ports.macAddress') }}</dt><dd class="mt-1 font-mono">{{ port.mac_address || '—' }}</dd></div>
          <div v-if="port.description" class="col-span-2"><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('common.description') }}</dt><dd class="mt-1 whitespace-pre-wrap">{{ port.description }}</dd></div>
          <div v-if="port.helper_usage || port.helper_label" class="col-span-2"><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('helperUsage.helperSection') }}</dt><dd class="mt-1">{{ [port.helper_usage, port.helper_label].filter(Boolean).join(' · ') }}</dd></div>
          <div v-if="lagGroup" class="col-span-2 border-t border-default pt-3"><dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ $t('lag.group') }}</dt><dd class="mt-1 flex flex-wrap items-center gap-2"><UBadge color="info" variant="soft">{{ lagGroup.name }}</UBadge><span class="text-xs text-muted">{{ lagGroup.port_ids.length }} {{ $t('lag.ports') }}</span><span v-if="lagGroup.remote_device" class="text-xs text-muted">→ {{ lagGroup.remote_device }}</span></dd></div>
        </dl>
      </div>

      <div v-else-if="port" class="space-y-4">
        <div class="flex gap-2">
          <UBadge>{{ port.type }}</UBadge>
          <UBadge :color="port.status === 'up' ? 'success' : port.status === 'disabled' ? 'error' : 'neutral'">{{ port.status }}</UBadge>
        </div>

        <UFormField :label="$t('common.status')">
          <div class="flex items-center gap-1" role="radiogroup" :aria-label="$t('common.status')">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="form.status === option.value"
              class="cursor-pointer px-2.5 py-1 text-xs font-medium rounded border transition-colors focus-visible:outline-2 focus-visible:outline-primary-500"
              :class="form.status === option.value ? option.activeClass : option.idleClass"
              @click="form.status = option.value"
              @keydown="onStatusKeydown($event, option.value)"
            >{{ option.label }}</button>
          </div>
        </UFormField>

        <UFormField :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :items="speeds" placeholder="Select speed" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.portMode')">
          <USelect v-model="form.port_mode" :items="portModeOptions" class="w-full" />
        </UFormField>

        <template v-if="form.port_mode === 'access'">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-model="form.access_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="targetSwitchConfiguredVlans" />
          </UFormField>
        </template>

        <template v-if="form.port_mode === 'trunk'">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-model="form.native_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="targetSwitchConfiguredVlans" />
          </UFormField>
          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect v-if="allVlans.length" v-model="selectedTaggedVlans" :vlans="allVlans" :configured-vlans="configuredVlans" :remote-configured-vlans="targetSwitchConfiguredVlans" />
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
            >
              <template #item-trailing="{ item }">
                <UBadge v-if="getMissingSwitchVlans((item as { value: string }).value).length" color="warning" variant="subtle" size="xs">
                  {{ $t('vlans.missingCount', { count: getMissingSwitchVlans((item as { value: string }).value).length }) }}
                </UBadge>
              </template>
            </USelectMenu>
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
          <div v-if="selectedSwitchId && targetSwitchMissingVlans.length > 0" class="mt-1 rounded-md border border-default bg-muted px-3 py-2 text-xs text-toned">
            <UIcon name="i-heroicons-information-circle" class="size-3.5 inline-block mr-1" />
            {{ $t('vlans.targetSwitchWillAdd', { vlans: targetSwitchMissingVlans.join(', ') }) }}
          </div>
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

        <UFormField v-if="port?.type === 'rj45' && poeCapable" :label="$t('templates.poe')">
          <USelect
            v-model="form.poe_selection"
            :items="poeOptions"
            class="w-full"
          />
        </UFormField>

        <!-- Helper View Settings (collapsible) -->
        <div class="border-t border-default pt-4 mt-4">
          <button
            class="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-toned"
            @click="helperExpanded = !helperExpanded"
          >
            <UIcon name="i-heroicons-chevron-right" :class="['h-3.5 w-3.5 transition-transform duration-200', helperExpanded ? 'rotate-90' : '']" />
            {{ $t('helperUsage.helperSection') }}
          </button>

          <div v-if="helperExpanded" class="mt-3 space-y-3">
            <UFormField :label="$t('helperUsage.label')" name="helper_usage">
              <USelect v-model="form.helper_usage" :items="helperUsageOptions" class="w-full" />
            </UFormField>

            <UFormField :label="$t('helperUsage.helperLabel')" name="helper_label">
              <UInput v-model="form.helper_label" :placeholder="$t('helperUsage.helperLabelPlaceholder')" class="w-full" />
            </UFormField>

            <UFormField name="show_in_helper_list">
              <UCheckbox v-model="form.show_in_helper_list" :label="$t('helperUsage.showInHelperList')" />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <UFormField :label="$t('lag.group')">
          <div v-if="lagGroup" class="flex items-center gap-2">
            <UBadge color="info" variant="soft" size="sm">{{ lagGroup.name }}</UBadge>
            <span v-if="lagGroup.remote_device" class="text-xs text-muted">→ {{ lagGroup.remote_device }}</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              @click="onRemoveFromLag"
            >
              {{ $t('lag.removeFromLag') }}
            </UButton>
          </div>
          <span v-else class="text-sm text-muted">{{ $t('common.none') }}</span>
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
      <div v-if="readonly" class="flex w-full justify-end">
        <UButton variant="subtle" color="neutral" @click="() => { isOpen = false }">{{ $t('common.close') }}</UButton>
      </div>
      <div v-else class="flex w-full items-center justify-between">
        <div class="flex items-center gap-2">
          <UButton variant="subtle" color="neutral" @click="requestClose">{{ $t('common.cancel') }}</UButton>
          <UDropdownMenu
            v-if="sourcePortOptions.length"
            :items="sourceMenuItems"
            :content="{ side: 'top', align: 'end' }"
            :ui="{ content: 'max-h-60 overflow-y-auto' }"
            :filter="{ placeholder: $t('switches.ports.searchPort') }"
          >
            <UTooltip :text="$t('switches.ports.copySource')">
              <UButton
                icon="i-heroicons-document-duplicate"
                variant="subtle"
                color="neutral"
                square
                :aria-label="$t('switches.ports.copySource')"
              />
            </UTooltip>
          </UDropdownMenu>
          <UButton :disabled="!baselineReady" @click="onSaveClick">{{ $t('common.save') }}</UButton>
        </div>
        <UButton color="error" variant="soft" icon="i-heroicons-arrow-path" @click="resetPort">{{ $t('switches.ports.resetPort') }}</UButton>
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
import type { LayoutUnit } from '~~/types/layoutTemplate'
import { buildCopyConnectionState, buildLagSyncFields, buildPortSaveDiff, buildSidePanelPortPutOptions } from '~/utils/sidePanelPortRequests'

const props = withDefaults(defineProps<{
  port: Port | null
  switchId: string
  lagGroup?: LAGGroup
  configuredVlans?: number[]
  switchUpdatedAt?: string
  templateUnits?: LayoutUnit[]
  /** All ports on the current switch, used to offer a same-switch source port for the copy-config picker. */
  ports?: Port[]
  vlans?: VLAN[]
  readonly?: boolean
}>(), {
  lagGroup: undefined,
  configuredVlans: () => [],
  switchUpdatedAt: undefined,
  templateUnits: () => [],
  ports: () => [],
  vlans: () => [],
  readonly: false
})

const emit = defineEmits<{
  saved: []
  'remove-from-lag': [lagId: string, portId: string]
  'access-changed': []
}>()

const isOpen = defineModel<boolean>()
const { t } = useI18n()
const toast = useToast()
const { canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
const { confirm } = useConfirm()
const { apiFetch } = useApiFetch()
const route = useRoute()
const speeds = ['100M', '1G', '2.5G', '10G', '40G', '100G']
const siteParams = computed(() => route.params.siteId && route.params.siteId !== 'all' ? { siteId: route.params.siteId as string } : undefined)

const portModeOptions = computed(() => [
  { label: t('switches.ports.modeAccess'), value: 'access' },
  { label: t('switches.ports.modeTrunk'), value: 'trunk' }
])

// Status segmented button group: same affordance as the connection-type selector below.
const statusOptions = computed(() => [
  {
    label: t('legend.up'), value: 'up',
    activeClass: 'bg-green-500/20 border-green-500/50 text-green-400',
    idleClass: 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
  },
  {
    label: t('legend.down'), value: 'down',
    activeClass: 'bg-red-500/20 border-red-500/50 text-red-400',
    idleClass: 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
  },
  {
    label: t('legend.disabled'), value: 'disabled',
    activeClass: 'bg-neutral-500/20 border-neutral-400/50 text-neutral-600 dark:text-neutral-300',
    idleClass: 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
  }
])

// Conventional radiogroup arrow-key navigation: left/up previous, right/down next, wrapping.
function onStatusKeydown(event: KeyboardEvent, value: string) {
  const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']
  if (!keys.includes(event.key)) return
  event.preventDefault()
  const options = statusOptions.value
  const current = options.findIndex(o => o.value === value)
  const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
  const nextIndex = (current + delta + options.length) % options.length
  const next = options[nextIndex]
  if (!next) return
  form.status = next.value
  const group = (event.currentTarget as HTMLElement).closest('[role="radiogroup"]')
  const buttons = group?.querySelectorAll<HTMLElement>('[role="radio"]')
  buttons?.[nextIndex]?.focus()
}

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

const poeOptions = computed(() => [
  { label: t('templates.poeDisabled'), value: 'disabled' },
  { label: '802.3af (15.4W)', value: '802.3af' },
  { label: '802.3at (30W)', value: '802.3at' },
  { label: '802.3bt Type 3 (60W)', value: '802.3bt-type3' },
  { label: '802.3bt Type 4 (100W)', value: '802.3bt-type4' },
  { label: 'Passive 24V', value: 'passive-24v' },
  { label: 'Passive 48V', value: 'passive-48v' },
])

const POE_WATTS: Record<string, number> = {
  'disabled': 0,
  '802.3af': 15.4, '802.3at': 30, '802.3bt-type3': 60,
  '802.3bt-type4': 100, 'passive-24v': 24, 'passive-48v': 48,
}

// Find the layout block that the current port belongs to (by unit + index range)
const portBlock = computed(() => {
  if (!props.port || !props.templateUnits) return undefined
  const unit = props.templateUnits.find(u => u.unit_number === props.port!.unit)
  if (!unit) return undefined
  return unit.blocks.find(b =>
    props.port!.index >= b.start_index && props.port!.index < b.start_index + b.count
  )
})

const poeCapable = computed(() => !!portBlock.value?.poe)

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

// Unsaved-changes guard. The editable surface spans more than `form` (VLAN and
// connection state live in separate refs), so snapshot a composite of all of it.
// Immutable copy of the editable surface (live state or a frozen rehydrated seed).
type SaveState = {
  form: typeof form
  selectedTaggedVlans: number[]
  taggedVlansStr: string
  connectionMode: 'switch' | 'device' | 'freetext'
  selectedAllocationId: string
  selectedSwitchId: string
  selectedPortId: string
}
function liveState(): SaveState {
  return {
    form: { ...form },
    selectedTaggedVlans: [...selectedTaggedVlans.value],
    taggedVlansStr: taggedVlansStr.value,
    connectionMode: connectionMode.value,
    selectedAllocationId: selectedAllocationId.value,
    selectedSwitchId: selectedSwitchId.value,
    selectedPortId: selectedPortId.value
  }
}
// Private to this component: while set, the guard snapshot reads the frozen rehydrated seed
// instead of the live (possibly user-edited) state. Only used synchronously around takeSnapshot().
let snapshotOverride: SaveState | null = null
const guardComposite = (st: SaveState) => ({
  ...st.form,
  selectedTaggedVlans: st.selectedTaggedVlans,
  taggedVlansStr: st.taggedVlansStr,
  connectionMode: st.connectionMode,
  selectedAllocationId: st.selectedAllocationId,
  selectedSwitchId: st.selectedSwitchId,
  selectedPortId: st.selectedPortId
})
const { takeSnapshot, requestClose, onOpenChange: onEditableOpenChange } = useSlideoverGuard(
  () => guardComposite(snapshotOverride ?? liveState()),
  () => { isOpen.value = false }
)
const helperExpanded = ref(false)

function onOpenChange(open: boolean) {
  if (props.readonly) {
    isOpen.value = open
    return
  }
  onEditableOpenChange(open)
}

function vlanLabel(vlanId: number): string {
  const vlan = props.vlans.find(item => item.vlan_id === vlanId)
  return vlan ? `${vlan.name} (${vlanId})` : String(vlanId)
}

async function fetchSwitches() {
  try {
    const route = useRoute()
    const siteId = route.params.siteId as string
    const params: Record<string, string> = {}
    if (siteId && siteId !== 'all') params.site_id = siteId
    const data = await apiFetch<{ data?: Switch[] } | Switch[]>('/api/switches', { params })
    allSwitches.value = (Array.isArray(data) ? data : data.data) || []
  } catch { /* ignore */ }
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

    // Fetch all networks
    const netRes = await apiFetch<{ data?: Network[]; items?: Network[] } | Network[]>('/api/networks', { params })
    const allNets = Array.isArray(netRes) ? netRes : (netRes.data || netRes.items || [])
    allNetworks.value = allNets

    // Fetch allocations from all networks in parallel
    const allocResults = await Promise.all(
      allNets.map(async (net) => {
        try {
          const a = await apiFetch<{ data?: IPAllocation[] } | IPAllocation[]>(`/api/networks/${net.id}/allocations`)
          return Array.isArray(a) ? a : (a.data || [])
        } catch { return [] }
      })
    )
    allAllocations.value = allocResults.flat()
  } catch { /* ignore */ }
}

// Missing VLANs for a given switch (used in switch dropdown badges)
function getMissingSwitchVlans(switchId: string): number[] {
  if (!switchId || !formVlanNumbers.value.length) return []
  const sw = allSwitches.value.find(s => s.id === switchId)
  if (!sw) return []
  const configured = new Set(sw.configured_vlans || [])
  return formVlanNumbers.value.filter(v => !configured.has(v))
}

// Target switch configured VLANs for badge display in VLAN selectors
const targetSwitchConfiguredVlans = computed(() => {
  if (!selectedSwitchId.value || selectedSwitchId.value === props.switchId) return undefined
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  return sw?.configured_vlans || []
})

// Target switch: check which VLANs are missing on the selected target
const targetSwitchMissingVlans = computed(() => {
  if (!selectedSwitchId.value || !formVlanNumbers.value.length) return []
  const sw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
  if (!sw) return []
  const targetConfigured = new Set(sw.configured_vlans || [])
  return formVlanNumbers.value.filter(v => !targetConfigured.has(v))
})

const switchSearchOptions = computed(() => [
  { label: '—', value: '', sw: null as Switch | null },
  ...allSwitches.value
    .map(s => ({ label: s.id === props.switchId ? `${s.name} (this switch)` : s.name, value: s.id, sw: s as Switch | null }))
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

function latestSwitchUpdatedAt(response: Record<string, unknown>): string | undefined {
  const value = response.updated_at
  return typeof value === 'string' ? value : props.switchUpdatedAt
}


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

// Settled baseline of the save candidate, derived ONLY from the frozen rehydrated seed of the
// current port (never from live, possibly user-edited state). Missing baseline => Save disabled.
const baseline = ref<{ candidate: Record<string, unknown>, signature: string } | null>(null)
const baselineReady = computed(() => baseline.value !== null)
let baselineEpoch = 0
let optionsReady: Promise<unknown> = Promise.resolve()

function stateSignature(st: SaveState): string {
  return [st.connectionMode, st.selectedSwitchId, st.selectedPortId, st.selectedAllocationId].join('|')
}
const connectionSignature = () => stateSignature(liveState())

function invalidateBaseline(): number {
  baseline.value = null
  return ++baselineEpoch
}

// Pure rehydrated state of a port (same mapping as the live rehydrate), complete even while options load.
function seedFromPort(p: Port): SaveState {
  const deviceId = p.connected_device_id || props.lagGroup?.remote_device_id || ''
  const mode: SaveState['connectionMode'] = p.connected_allocation_id ? 'device' : deviceId ? 'switch' : 'freetext'
  return {
    form: {
      status: p.status,
      speed: p.speed || '',
      port_mode: p.port_mode || (p.tagged_vlans?.length ? 'trunk' : 'access'),
      access_vlan: p.access_vlan || null,
      native_vlan: p.native_vlan || null,
      connected_device: p.connected_device || '',
      connected_port: p.connected_port || '',
      description: p.description || '',
      mac_address: p.mac_address || '',
      poe_selection: p.poe?.type || '',
      helper_usage: p.helper_usage || '_automatic',
      helper_label: p.helper_label || '',
      show_in_helper_list: p.show_in_helper_list ?? true
    },
    selectedTaggedVlans: [...(p.tagged_vlans || [])],
    taggedVlansStr: (p.tagged_vlans || []).join(','),
    connectionMode: mode,
    selectedAllocationId: mode === 'device' ? (p.connected_allocation_id || '') : '',
    selectedSwitchId: mode === 'switch' ? deviceId : '',
    selectedPortId: mode === 'switch' ? (p.connected_port_id || '') : ''
  }
}

// Shared settle for open and port replacement. Every step re-verifies that this is still the same
// session (epoch/open/editable/same port+switch) before touching anything.
async function settleSession(epoch: number, seed: SaveState, portId: string, switchId: string) {
  const valid = () => epoch === baselineEpoch && isOpen.value && !props.readonly
    && props.port?.id === portId && props.switchId === switchId
  if (!valid()) return
  await optionsReady
  if (!valid()) return
  // Resolve a pending switch selection only if the live state still holds that same unresolved selection.
  if (seed.connectionMode === 'switch' && pendingSwitchId.value === seed.selectedSwitchId
    && connectionMode.value === 'switch' && !selectedSwitchId.value) {
    selectedSwitchId.value = pendingSwitchId.value
    selectedPortId.value = pendingPortId.value
  }
  baseline.value = { candidate: buildSaveBody(seed), signature: stateSignature(seed) }
  snapshotOverride = seed
  try { takeSnapshot() } finally { snapshotOverride = null }
}

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
  const baselineEpochAtChange = invalidateBaseline()
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
    } else if (p.connected_device_id || props.lagGroup?.remote_device_id) {
      connectionMode.value = 'switch'
      selectedAllocationId.value = ''
      const deviceId = p.connected_device_id || props.lagGroup?.remote_device_id || ''
      const portId = p.connected_port_id || ''
      pendingSwitchId.value = deviceId
      pendingPortId.value = portId
      if (allSwitches.value.length) {
        selectedSwitchId.value = deviceId
        selectedPortId.value = portId
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
    if (isOpen.value && !props.readonly) void settleSession(baselineEpochAtChange, seedFromPort(p), p.id, props.switchId)
  }
}, { immediate: true })

watch(isOpen, async (open) => {
  if (!open) {
    invalidateBaseline()
    return
  }
  if (open) {
    if (props.readonly) return
    const openEpoch = invalidateBaseline()
    const openPortId = props.port?.id
    const openSwitchId = props.switchId
    const seed = props.port ? seedFromPort(props.port) : null

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
      } else if (p.connected_device_id || props.lagGroup?.remote_device_id) {
        connectionMode.value = 'switch'
        selectedAllocationId.value = ''
        const deviceId = p.connected_device_id || props.lagGroup?.remote_device_id || ''
        pendingSwitchId.value = deviceId; pendingPortId.value = p.connected_port_id || ''
      } else {
        connectionMode.value = 'freetext'
        selectedAllocationId.value = ''; selectedSwitchId.value = ''; selectedPortId.value = ''; pendingSwitchId.value = ''; pendingPortId.value = ''
      }
      nextTick(() => { isRehydrating = false })
    }
    optionsReady = Promise.all([fetchSwitches(), fetchVlans(), fetchAllocations()])
    // Baseline + guard snapshot come from the frozen seed once options settled (no live reads).
    if (seed && openPortId) await settleSession(openEpoch, seed, openPortId, openSwitchId)
  }
})

watch(selectedSwitchId, (newVal, oldVal) => { if (oldVal && newVal !== oldVal) selectedPortId.value = '' })

const showSetUpPrompt = ref(false)

watch(() => props.readonly, (readOnly, wasEditable) => {
  if (readOnly && wasEditable === false) showSetUpPrompt.value = false
})

async function onSaveClick() {
  if (props.readonly || !canEditInfrastructure.value) return
  if (connectionMode.value === 'switch' && selectedSwitchId.value && selectedPortId.value && form.status === 'down') { showSetUpPrompt.value = true; return }
  await save()
}

// Current save candidate: everything the panel could write, after VLAN/connection coupling.
// Protocol fields (expected_updated_at, add_vlans_to_target_switch) are intentionally NOT part of it.
function buildSaveBody(st: SaveState = liveState()): Record<string, unknown> {
  const tagged_vlans = allVlans.value.length ? [...st.selectedTaggedVlans] : st.taggedVlansStr ? st.taggedVlansStr.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v)) : []
  const body: Record<string, unknown> = { ...st.form, tagged_vlans }
  if (poeCapable.value) {
    body.poe = st.form.poe_selection ? { type: st.form.poe_selection, max_watts: POE_WATTS[st.form.poe_selection] } : null
  }
  delete body.poe_selection
  body.helper_usage = st.form.helper_usage === '_automatic' ? null : (st.form.helper_usage || null)
  body.helper_label = st.form.helper_label || null
  body.show_in_helper_list = st.form.show_in_helper_list
  if (st.form.port_mode === 'access') { body.native_vlan = null; body.tagged_vlans = [] }
  if (st.form.port_mode === 'trunk') { body.access_vlan = null }
  // Set connected_allocation_id based on mode
  if (st.connectionMode === 'device') {
    body.connected_allocation_id = st.selectedAllocationId || null
    body.connected_device_id = null
    body.connected_port_id = null
    body.connected_port = null
    if (!st.selectedAllocationId) {
      body.connected_device = null
    }
  } else {
    body.connected_allocation_id = null
  }
  if (st.connectionMode === 'switch' && st.selectedSwitchId) {
    const sw = allSwitches.value.find(s => s.id === st.selectedSwitchId)
    body.connected_device = sw?.name || ''; body.connected_device_id = st.selectedSwitchId; body.connected_port_id = st.selectedPortId || null
    if (st.selectedPortId) { const port = sw?.ports?.find((p: Port) => p.id === st.selectedPortId); body.connected_port = port?.label || '' } else { body.connected_port = null }
  } else if (st.connectionMode === 'switch') {
    body.connected_device = null; body.connected_device_id = null; body.connected_port_id = null; body.connected_port = null
  } else { body.connected_device_id = null; body.connected_port_id = null }
  return body
}

async function save() {
  if (props.readonly || !canEditInfrastructure.value) return
  // Fail closed: without a settled baseline no (full) write is ever sent.
  const base = baseline.value
  if (!base || !props.port) return
  const diff = buildPortSaveDiff(base.candidate, buildSaveBody(), { baselineSignature: base.signature, currentSignature: connectionSignature() })
  if (!diff) {
    // Nothing changed: no request, no concurrency/activity bump.
    showSetUpPrompt.value = false
    emit('saved'); isOpen.value = false
    return
  }
  const body: Record<string, unknown> = { ...diff.body }
  if (props.switchUpdatedAt) body.expected_updated_at = props.switchUpdatedAt
  try {
    const response = await $fetch<Record<string, unknown>>(
      `/api/switches/${props.switchId}/ports/${props.port!.id}`,
      buildSidePanelPortPutOptions(body, siteParams.value?.siteId)
    )

    if (!canEditInfrastructure.value || props.readonly) {
      emit('saved')
      return
    }

    const vlansAdded = (response as Record<string, unknown>)?.vlans_added_to_target_switch as number[] | undefined
    if (vlansAdded?.length) {
      const targetSw = allSwitches.value.find(s => s.id === selectedSwitchId.value)
      toast.add({ title: t('vlans.addedToTargetSwitch', { vlans: vlansAdded.join(', '), switch: targetSw?.name || '' }) })
    }

    let lagSynced = false
    if ((props.lagGroup?.port_ids?.length ?? 0) > 1) {
      if (!canEditInfrastructure.value || props.readonly) {
        emit('saved')
        return
      }
      // Propagate only fields that actually changed (never the unchanged link dependency IDs).
      const syncSource = { ...diff.body }
      for (const key of diff.dependencyKeys) delete syncSource[key]
      const syncFields = buildLagSyncFields(syncSource)
      const lagPortIds = [...props.lagGroup!.port_ids!]
      if (Object.keys(syncFields).some(key => key !== 'add_vlans_to_target_switch')) {
        await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
          method: 'PUT',
          query: siteParams.value,
          body: {
            port_ids: lagPortIds,
            lag_group_id: props.lagGroup!.id,
            updates: syncFields,
            expected_updated_at: latestSwitchUpdatedAt(response)
          }
        })
        lagSynced = true
      }
      toast.add({ title: t('switches.ports.portUpdated') + (lagSynced ? ` (${lagPortIds.length} LAG ports)` : ''), color: 'success' })
    } else {
      toast.add({ title: t('switches.ports.portUpdated'), color: 'success' })
    }

    emit('saved'); isOpen.value = false
  } catch (e: unknown) {
    const access = await handleInfrastructureForbidden(e)
    if (access === 'demoted') emit('access-changed')
    if (access === 'demoted' || access === 'already-handled') {
      showSetUpPrompt.value = false
      emit('saved')
      return
    }
    const err = e as { statusCode?: number; data?: { message?: string } }
    if (err.statusCode === 409) {
      toast.add({ title: 'Switch was modified. Please try again.', color: 'warning' })
      emit('saved')
      return
    }
    toast.add({ title: err.data?.message || 'Failed', color: 'error' })
  }
}

function onRemoveFromLag() {
  if (props.readonly || !canEditInfrastructure.value || !props.lagGroup || !props.port) return
  emit('remove-from-lag', props.lagGroup.id, props.port!.id)
}

// Compact footer picker: prefill selected config from another same-switch port.
// Keeps identity/label/position, description, MAC and LAG; connection links are never copied.
const sourcePortOptions = computed(() =>
  props.ports
    .filter(p => p.id !== props.port?.id)
    .map(p => ({ label: p.label || `${p.unit}/${p.index}`, value: p.id }))
)

function applyCopyFromPort(sourceId: string) {
  const source = props.ports.find(p => p.id === sourceId)
  if (!source) return
  form.status = source.status
  form.speed = source.speed || ''
  form.port_mode = source.port_mode || (source.tagged_vlans?.length ? 'trunk' : 'access')
  form.access_vlan = source.access_vlan ?? null
  form.native_vlan = source.native_vlan ?? null
  form.poe_selection = source.poe?.type || ''
  form.helper_usage = source.helper_usage || '_automatic'
  form.helper_label = source.helper_label || ''
  form.show_in_helper_list = source.show_in_helper_list ?? true
  selectedTaggedVlans.value = [...(source.tagged_vlans || [])]
  taggedVlansStr.value = (source.tagged_vlans || []).join(',')

  const connectionState = buildCopyConnectionState(source)
  isRehydrating = true
  connectionMode.value = connectionState.connectionMode
  selectedSwitchId.value = connectionState.selectedSwitchId
  selectedPortId.value = connectionState.selectedPortId
  selectedAllocationId.value = connectionState.selectedAllocationId
  form.connected_device = connectionState.connected_device
  form.connected_port = connectionState.connected_port
  nextTick(() => { isRehydrating = false })
}

// One-shot dropdown items for the icon-only copy trigger; each selection prefills via applyCopyFromPort.
const sourceMenuItems = computed(() =>
  sourcePortOptions.value.map(o => ({ label: o.label, onSelect: () => applyCopyFromPort(o.value) }))
)

async function resetPort() {
  if (props.readonly || !canEditInfrastructure.value) return
  const ok = await confirm({
    title: t('switches.ports.confirmBulkResetTitle'),
    message: t('switches.ports.confirmReset'),
    confirmLabel: t('switches.ports.reset')
  })
  if (!ok || props.readonly || !canEditInfrastructure.value) return
  try {
    const siteId = useRoute().params.siteId as string
    const query = siteId && siteId !== 'all' ? `?siteId=${encodeURIComponent(siteId)}` : ''
    await ($fetch as typeof globalThis.fetch)(`/api/switches/${props.switchId}/ports/${props.port!.id}${query}`, { method: 'DELETE' })
    toast.add({ title: t('switches.ports.portReset'), color: 'success' }); emit('saved'); isOpen.value = false
  } catch (e: unknown) {
    const access = await handleInfrastructureForbidden(e)
    if (access === 'demoted') emit('access-changed')
    if (access === 'demoted' || access === 'already-handled') return
    const err = e as { data?: { message?: string } }
    toast.add({ title: err.data?.message || 'Reset failed', color: 'error' })
  }
}
</script>
