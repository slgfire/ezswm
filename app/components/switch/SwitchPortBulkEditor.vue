<template>
  <USlideover v-model:open="isOpen" :title="$t('switches.ports.bulkEditTitle', { count: selectedPorts.length })" description="Edit multiple ports at once">

    <template #body>
      <div class="space-y-4">
        <p class="text-xs text-gray-400">{{ $t('switches.ports.bulkEditHint', { count: selectedPorts.length }) }}</p>

        <UFormField :label="$t('common.status')">
          <USelect v-model="form.status" :items="statusOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('switches.ports.speed')">
          <USelect v-model="form.speed" :items="speedOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <!-- Port Mode -->
        <UFormField :label="$t('switches.ports.portMode')">
          <USelect v-model="form.port_mode" :items="portModeOptions" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <!-- Override Toggle -->
        <div v-if="allVlans.length > 0 && configuredVlans" class="flex items-center gap-2 mb-3">
          <USwitch v-model="addVlansToSwitch" size="xs" />
          <span class="text-xs text-dimmed">{{ $t('vlans.addToSwitchToggle') }}</span>
        </div>

        <!-- Access VLAN -->
        <template v-if="form.port_mode === 'access'">
          <UFormField :label="$t('switches.ports.accessVlan')">
            <VlanDropdown v-if="allVlans.length" v-model="form.access_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :override-active="addVlansToSwitch" />
            <UInput v-else v-model.number="form.access_vlan" type="number" :placeholder="$t('common.noChange')" class="w-full" />
          </UFormField>
        </template>

        <!-- Trunk: Native + Tagged -->
        <template v-if="form.port_mode === 'trunk'">
          <UFormField :label="$t('switches.ports.nativeVlan')">
            <VlanDropdown v-if="allVlans.length" v-model="form.native_vlan" :vlans="allVlans" :configured-vlans="configuredVlans" :override-active="addVlansToSwitch" />
            <UInput v-else v-model.number="form.native_vlan" type="number" :placeholder="$t('common.noChange')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('switches.ports.taggedVlans')">
            <VlanMultiSelect
              v-if="allVlans.length"
              v-model="selectedTaggedVlans"
              :vlans="allVlans"
              :configured-vlans="configuredVlans"
              :override-active="addVlansToSwitch"
            />
            <UInput v-else v-model="form.tagged_vlans_str" placeholder="e.g. 100,200,300" class="w-full" />
          </UFormField>
        </template>

        <UFormField :label="$t('common.description')">
          <UInput v-model="form.description" :placeholder="$t('common.noChange')" class="w-full" />
        </UFormField>

        <UFormField :label="$t('helperUsage.label')">
          <USelect v-model="form.helper_usage" :items="bulkHelperUsageOptions" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <UButton variant="ghost" color="neutral" @click="close">{{ $t('common.cancel') }}</UButton>
        <UButton @click="apply">{{ $t('switches.ports.applyToPorts', { count: selectedPorts.length }) }}</UButton>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { VLAN } from '~~/types/vlan'

const props = defineProps<{
  switchId: string
  selectedPorts: string[]
  configuredVlans?: number[]
  switchUpdatedAt?: string
}>()

const emit = defineEmits<{ saved: [], 'clear-selection': [] }>()
const { t } = useI18n()
const toast = useToast()
const { apiFetch } = useApiFetch()

const isOpen = ref(false)
const allVlans = ref<VLAN[]>([])
const selectedTaggedVlans = ref<number[]>([])
const addVlansToSwitch = ref(false)


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

const form = reactive({
  status: '',
  speed: '',
  port_mode: '',
  access_vlan: null as number | null,
  native_vlan: null as number | null,
  tagged_vlans_str: '',
  description: '',
  helper_usage: '_no_change'
})

function open() {
  isOpen.value = true
  fetchVlans()
}

defineExpose({ open })

function close() {
  isOpen.value = false
  emit('clear-selection')
}

async function apply() {
  const updates: Record<string, string | number | number[] | null> = {}
  if (form.status) updates.status = form.status
  if (form.speed) updates.speed = form.speed
  if (form.port_mode) {
    updates.port_mode = form.port_mode
    if (form.port_mode === 'access') {
      if (form.access_vlan) updates.access_vlan = form.access_vlan
      updates.native_vlan = null
      updates.tagged_vlans = []
    } else {
      updates.access_vlan = null
      if (form.native_vlan) updates.native_vlan = form.native_vlan
      if (selectedTaggedVlans.value.length) {
        updates.tagged_vlans = [...selectedTaggedVlans.value]
      } else if (form.tagged_vlans_str) {
        updates.tagged_vlans = form.tagged_vlans_str.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v))
      }
    }
  }
  if (form.description) updates.description = form.description
  if (form.helper_usage !== '_no_change') {
    updates.helper_usage = form.helper_usage === '_automatic' ? null : form.helper_usage
  }

  try {
    await $fetch(`/api/switches/${props.switchId}/ports/bulk`, {
      method: 'PUT',
      body: {
        port_ids: props.selectedPorts,
        updates,
        add_vlans_to_switch: addVlansToSwitch.value || undefined,
        expected_updated_at: props.switchUpdatedAt || undefined
      }
    })
    toast.add({ title: t('switches.ports.updatedPorts', { count: props.selectedPorts.length }), color: 'success' })
    // Reset form
    form.status = ''
    form.speed = ''
    form.port_mode = ''
    form.access_vlan = null
    form.native_vlan = null
    form.tagged_vlans_str = ''
    form.description = ''
    form.helper_usage = '_no_change'
    selectedTaggedVlans.value = []
    addVlansToSwitch.value = false
    emit('saved')
    close()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: err.data?.message || 'Failed', color: 'error' })
  }
}
</script>
