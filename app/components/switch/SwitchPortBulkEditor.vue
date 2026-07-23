<template>
  <USlideover :open="isOpen" :title="$t('switches.ports.bulkEditTitle', { count: selectedPorts.length })" description="Edit multiple ports at once" @update:open="onOpenChange">

    <template #body>
      <div class="space-y-4">
        <p class="text-xs text-gray-400">{{ $t('switches.ports.bulkEditHint', { count: selectedPorts.length }) }}</p>
        <UFormField :label="$t('switches.ports.copySource')">
          <USelect v-model="copySourceId" :items="sourceOptionsWithClear" :placeholder="$t('switches.ports.copySourcePlaceholder')" class="w-full" />
          <p class="mt-1 text-xs text-amber-400">{{ $t('switches.ports.copyPrefillHint') }}</p>
        </UFormField>

        <UFormField :label="$t('common.status')">
          <USelect v-model="form.status" :items="statusOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :items="speedOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.portMode')">
          <USelect v-model="form.port_mode" :items="portModeOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <template v-if="form.port_mode === 'access' || form.port_mode === ''">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-if="allVlans.length" v-model="form.access_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" />
            <UInput v-else v-model.number="form.access_vlan" type="number" :placeholder="$t('common.noChange')" class="w-full" />
          </UFormField>
        </template>

        <template v-if="form.port_mode === 'trunk' || form.port_mode === ''">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-if="allVlans.length" v-model="form.native_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" />
            <UInput v-else v-model.number="form.native_vlan" type="number" :placeholder="$t('common.noChange')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect
              v-if="allVlans.length"
              v-model="selectedTaggedVlans"
              :vlans="allVlans"
              :configured-vlans="configuredVlans"
            />
            <UInput v-else v-model="form.tagged_vlans_str" placeholder="e.g. 100,200,300" class="w-full" />
          </UFormField>
        </template>

        <UFormField :label="$t('common.description')">
          <UInput v-model="form.description" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('templates.poe')">
          <USelect v-model="form.poe_selection" :items="bulkPoeOptions" class="w-full" />
        </UFormField>

        <UFormField :label="$t('helperUsage.label')">
          <USelect v-model="form.helper_usage" :items="bulkHelperUsageOptions" class="w-full" />
        </UFormField>

        <UFormField :label="$t('helperUsage.helperLabel')">
          <UInput v-model="form.helper_label" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('helperUsage.showInHelperList')">
          <USelect v-model="form.show_in_helper_list" :items="bulkShowInHelperOptions" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <UButton variant="ghost" color="neutral" @click="requestClose">{{ $t('common.cancel') }}</UButton>
        <UButton @click="apply">{{ $t('switches.ports.applyToPorts', { count: selectedPorts.length }) }}</UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { VLAN } from '~~/types/vlan'
import type { Port } from '~~/types/port'
import { buildBulkSourceOptions, buildBulkUpdates, buildCopyPrefill, completeLagId } from '~/utils/lagBulk'
import { hasLagTargets } from '~/utils/lagCopyTargets'

const props = defineProps<{
  switchId: string
  selectedPorts: string[]
  ports: Port[]
  configuredVlans?: number[]
  switchUpdatedAt?: string
}>()

const emit = defineEmits<{ saved: [], 'clear-selection': [] }>()
const { t } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const { apiFetch } = useApiFetch()
const route = useRoute()
const siteParams = computed(() => route.params.siteId && route.params.siteId !== 'all' ? { siteId: route.params.siteId as string } : undefined)

const isOpen = ref(false)
const allVlans = ref<VLAN[]>([])
const selectedTaggedVlans = ref<number[]>([])
const CLEAR_COPY_SOURCE = '_no_source' as const
const copySourceId = ref(CLEAR_COPY_SOURCE)
const sourceOptions = computed(() => buildBulkSourceOptions(props.ports))
const sourceOptionsWithClear = computed(() => [
  { label: '—', value: CLEAR_COPY_SOURCE },
  ...sourceOptions.value
])
const hasSourcePrefill = ref(false)
const explicitPrefillFields = ref(new Set<string>())
const resetSourceSelectionSilently = ref(false)

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

const statusOptions = computed(() => [
  { label: t('legend.up'), value: 'up' },
  { label: t('legend.down'), value: 'down' },
  { label: t('legend.disabled'), value: 'disabled' }
])

const speedOptions = computed(() => [
  { label: '100M', value: '100M' },
  { label: '1G', value: '1G' },
  { label: '2.5G', value: '2.5G' },
  { label: '10G', value: '10G' },
  { label: '100G', value: '100G' }
])

const portModeOptions = computed(() => [
  { label: t('switches.ports.modeAccess'), value: 'access' },
  { label: t('switches.ports.modeTrunk'), value: 'trunk' }
])

const bulkHelperUsageOptions = computed(() => [
  { value: '_no_change', label: '—' },
  { value: '_automatic', label: t('helperUsage.automatic') },
  { value: 'participant', label: t('helperUsage.participant') },
  { value: 'phone_passthrough', label: t('helperUsage.phone_passthrough') },
  { value: 'ap', label: t('helperUsage.ap') },
  { value: 'printer', label: t('helperUsage.printer') },
  { value: 'orga', label: t('helperUsage.orga') },
  { value: 'uplink', label: t('helperUsage.uplink') },
])

const bulkPoeOptions = computed(() => [
  { value: '_no_change', label: '—' },
  { value: '_clear', label: t('templates.poeNone') },
  { value: 'disabled', label: t('templates.poeDisabled') },
  { value: '802.3af', label: '802.3af (15.4W)' },
  { value: '802.3at', label: '802.3at (30W)' },
  { value: '802.3bt-type3', label: '802.3bt Type 3 (60W)' },
  { value: '802.3bt-type4', label: '802.3bt Type 4 (100W)' },
  { value: 'passive-24v', label: 'Passive 24V' },
  { value: 'passive-48v', label: 'Passive 48V' }
])

const bulkShowInHelperOptions = computed(() => [
  { value: '_no_change', label: '—' },
  { value: 'true', label: t('common.yes') },
  { value: 'false', label: t('common.no') }
])

const form = reactive({
  status: '',
  speed: '',
  port_mode: '',
  access_vlan: null as number | null,
  native_vlan: null as number | null,
  tagged_vlans_str: '',
  description: '',
  helper_usage: '_no_change',
  helper_label: '',
  show_in_helper_list: '_no_change',
  poe_selection: '_no_change'
})

const { takeSnapshot, requestClose, onOpenChange } = useSlideoverGuard(
  () => ({ ...form, selectedTaggedVlans: selectedTaggedVlans.value }),
  () => close()
)

function open() {
  isOpen.value = true
  takeSnapshot()
  fetchVlans()
  copySourceId.value = CLEAR_COPY_SOURCE
  hasSourcePrefill.value = false
  explicitPrefillFields.value = new Set()
}

defineExpose({ open })

function close() {
  isOpen.value = false
  emit('clear-selection')
}

async function apply() {
  if (hasSourcePrefill.value && hasLagTargets(props.selectedPorts, props.ports)) {
    toast.add({ title: t('switches.ports.copyLagBlocked'), color: 'error' })
    return
  }

  if (hasSourcePrefill.value && !(await confirm({
    title: t('switches.ports.copyConfirmTitle'),
    message: t('switches.ports.copyWarning')
  }))) {
    return
  }

  const taggedFromInput = form.tagged_vlans_str
    ? form.tagged_vlans_str.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
    : []

  const updates = buildBulkUpdates({
    form,
    selectedTaggedVlans: selectedTaggedVlans.value,
    explicitPrefillFields: explicitPrefillFields.value,
    taggedFromInput,
    poeWatts: POE_WATTS
  })

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
      query: siteParams.value,
      body: {
        port_ids: props.selectedPorts,
        ...(completeLagId(props.selectedPorts, props.ports) ? { lag_group_id: completeLagId(props.selectedPorts, props.ports) } : {}),
        apply_after_copy_prefill: hasSourcePrefill.value,
        updates,
        expected_updated_at: props.switchUpdatedAt || undefined
      }
    })
    toast.add({ title: t('switches.ports.updatedPorts', { count: props.selectedPorts.length }), color: 'success' })
    form.status = ''
    form.speed = ''
    form.port_mode = ''
    form.access_vlan = null
    form.native_vlan = null
    form.tagged_vlans_str = ''
    form.description = ''
    form.helper_usage = '_no_change'
    form.helper_label = ''
    form.show_in_helper_list = '_no_change'
    form.poe_selection = '_no_change'
    selectedTaggedVlans.value = []
    hasSourcePrefill.value = false
    explicitPrefillFields.value = new Set()
    emit('saved')
    close()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err.data?.message || t('switches.ports.updateFailed'), color: 'error' })
  }
}

const POE_WATTS: Record<string, number> = {
  disabled: 0,
  '802.3af': 15.4,
  '802.3at': 30,
  '802.3bt-type3': 60,
  '802.3bt-type4': 100,
  'passive-24v': 24,
  'passive-48v': 48
}

watch(copySourceId, (value) => {
  if (!value || value === CLEAR_COPY_SOURCE) {
    if (resetSourceSelectionSilently.value) {
      resetSourceSelectionSilently.value = false
      return
    }
    hasSourcePrefill.value = false
    explicitPrefillFields.value = new Set()
    return
  }
  const source = props.ports.find(port => port.id === value)
  if (!source) {
    copySourceId.value = CLEAR_COPY_SOURCE
    return
  }
  const prefill = buildCopyPrefill(source)
  form.status = prefill.status
  form.speed = prefill.speed ?? ''
  form.port_mode = prefill.port_mode ?? ''
  form.access_vlan = prefill.access_vlan
  form.native_vlan = prefill.native_vlan
  selectedTaggedVlans.value = [...prefill.tagged_vlans]
  form.tagged_vlans_str = prefill.tagged_vlans.join(',')
  form.helper_usage = prefill.helper_usage ?? '_automatic'
  form.helper_label = prefill.helper_label ?? ''
  form.show_in_helper_list = prefill.show_in_helper_list ? 'true' : 'false'
  form.poe_selection = prefill.poe_selection ?? '_clear'
  hasSourcePrefill.value = true
  explicitPrefillFields.value = new Set([
    'status',
    'speed',
    'port_mode',
    'access_vlan',
    'native_vlan',
    'tagged_vlans',
    'helper_usage',
    'helper_label',
    'show_in_helper_list',
    'poe'
  ])
  resetSourceSelectionSilently.value = true
  copySourceId.value = CLEAR_COPY_SOURCE
})
</script>
