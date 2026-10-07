<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-start justify-between gap-4">
      <div class="flex min-w-0 items-start gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" :to="`/sites/${siteId}/subnets`" />
        <div class="min-w-0">
          <h1 class="break-words text-xl font-bold">{{ network?.name || $t('common.loading') }}</h1>
          <p class="mt-1 text-sm text-muted">{{ $t('networks.detailDescription') }}</p>
        </div>
      </div>
      <div v-if="network && canEditInfrastructure" class="flex items-center gap-1">
        <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="sm" :title="$t('common.edit')" @click="startEdit()" />
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="openDeleteNetwork()" />
      </div>
    </div>

    <SharedViewOnlyNotice v-if="authResolved && !canEditInfrastructure" class="mb-4" />

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-muted" />
    </div>

    <div v-else-if="network" class="space-y-5">
      <NetworkInfoBar
        v-model:show-details="showDetails"
        :network="network"
        :subnet-info="subnetInfo"
        :is-point-to-point="isPointToPoint"
        :is-host-route="isHostRoute"
        :associated-vlan="associatedVlan"
        :allocations-count="allocations.length"
        :utilization-percent="utilizationPercent"
        :format-dns="formatDns"
      />

      <NetworkUtilizationBar
        :utilization-percent="utilizationPercent"
        :dhcp-range-percent="dhcpRangePercent"
        :reserved-range-percent="reservedRangePercent"
        :allocations-count="allocations.length"
      />

      <!-- Unified IP Overview -->
      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-semibold text-default">{{ $t('networks.unified.title') }}</h2>
          <UButton v-if="canEditInfrastructure" icon="i-heroicons-plus" size="sm" @click="openAddPanel()">
            {{ $t('common.add') }}
          </UButton>
        </div>

        <!-- Unified list -->
        <div class="divide-y divide-default overflow-hidden rounded-lg border border-default bg-default">
          <div
            v-for="row in unifiedList"
            :key="row.key"
            class="group flex items-center gap-3 px-4 py-2.5 transition-colors"
            :class="rowClass(row)"
            :role="row.kind !== 'fixed' && !canEditInfrastructure ? 'button' : undefined"
            :tabindex="row.kind !== 'fixed' && !canEditInfrastructure ? 0 : undefined"
            @click="onRowClick(row)"
            @keydown.enter.stop.prevent="!canEditInfrastructure && onRowClick(row)"
            @keydown.space.stop.prevent="!canEditInfrastructure && onRowClick(row)"
          >
            <!-- Fixed rows (network, gateway, broadcast) -->
            <template v-if="row.kind === 'fixed'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="row.ip!"><code class="font-mono text-xs text-toned">{{ row.ip }}</code></SharedCopyButton>
              </div>
              <div class="flex-1">
                <span class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ row.label }}</span>
              </div>
            </template>

            <!-- Allocation rows -->
            <template v-else-if="row.kind === 'allocation'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="(row.data as IPAllocation).ip_address"><code class="font-mono text-xs text-highlighted">{{ (row.data as IPAllocation).ip_address }}</code></SharedCopyButton>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium text-highlighted">{{ (row.data as IPAllocation).hostname || (row.data as IPAllocation).ip_address }}</span>
                  <UBadge v-if="(row.data as IPAllocation).device_type" variant="subtle" color="neutral" size="sm">{{ $t(`networks.allocations.deviceTypes.${(row.data as IPAllocation).device_type}`) }}</UBadge>
                  <UBadge :color="(row.data as IPAllocation).status === 'active' ? 'success' : (row.data as IPAllocation).status === 'reserved' ? 'warning' : 'neutral'" variant="subtle" size="sm">{{ $t(`networks.allocations.statuses.${(row.data as IPAllocation).status}`) }}</UBadge>
                </div>
                <div v-if="(row.data as IPAllocation).description || (row.data as IPAllocation).mac_address" class="mt-0.5 flex items-center gap-3 text-[11px] text-muted">
                  <span v-if="(row.data as IPAllocation).description">{{ (row.data as IPAllocation).description }}</span>
                  <SharedCopyButton v-if="(row.data as IPAllocation).mac_address" :value="(row.data as IPAllocation).mac_address!"><span class="font-mono">{{ (row.data as IPAllocation).mac_address }}</span></SharedCopyButton>
                </div>
              </div>
              <div v-if="canEditInfrastructure" class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openEditAlloc(row.data as IPAllocation)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteAllocDialog(row.data as IPAllocation)" />
              </div>
            </template>

            <!-- Range rows -->
            <template v-else-if="row.kind === 'range'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="`${(row.data as IPRange).start_ip} - ${(row.data as IPRange).end_ip}`"><code class="font-mono text-xs text-highlighted">{{ (row.data as IPRange).start_ip }} – {{ abbreviateEndIp((row.data as IPRange).start_ip, (row.data as IPRange).end_ip) }}</code></SharedCopyButton>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="rangeTypeBadgeColor((row.data as IPRange).type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${(row.data as IPRange).type}`) }}</UBadge>
                  <UBadge :color="rangeTypeBadgeColor((row.data as IPRange).type)" variant="subtle" size="sm" class="font-mono">{{ $t('networks.ranges.ipCount', { count: rangeIpCount((row.data as IPRange).start_ip, (row.data as IPRange).end_ip) }) }}</UBadge>
                  <span v-if="(row.data as IPRange).description" class="text-xs text-muted">{{ (row.data as IPRange).description }}</span>
                  <span v-if="(row.data as IPRange).type !== 'dhcp' && countAllocsInRange(row.data as IPRange) > 0" class="text-xs text-muted">
                    ({{ $t('networks.ranges.ipsDocumented', { count: countAllocsInRange(row.data as IPRange) }) }})
                  </span>
                </div>
              </div>
              <div v-if="canEditInfrastructure" class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openRangeEdit(row.data as IPRange)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteRange(row.data as IPRange)" />
              </div>
            </template>
          </div>
          <div v-if="unifiedList.length === 0" class="px-4 py-3">
            <p class="text-xs text-muted">{{ $t('common.noData') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Network edit slideover -->
    <USlideover v-if="canEditInfrastructure" :open="editing" @update:open="onEditOpenChange">
      <template #title>
        <span>{{ $t('networks.edit') }}</span>
      </template>

      <template #body>
        <UForm ref="editFormRef" :state="editForm" :validate="validate" :validate-on="['blur', 'change']" novalidate class="space-y-4" @submit="onSave">
          <UFormField :label="$t('networks.fields.name')" name="name" required>
            <UInput v-model="editForm.name" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.fields.subnet')" name="subnet" required>
            <UInput v-model="editForm.subnet" required class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.fields.gateway')" name="gateway">
            <UInput v-model="editForm.gateway" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.fields.dnsServers')" name="dns_servers">
            <UInput v-model="editDnsInput" placeholder="8.8.8.8, 8.8.4.4" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.fields.vlan')" name="vlan_id">
            <USelect v-model="editForm.vlan_id" :items="vlanOptions" placeholder="-" class="w-full" />
          </UFormField>
          <UFormField :label="$t('networks.fields.excludeFromUtilization')" name="exclude_from_utilization">
            <USwitch v-model="editForm.exclude_from_utilization" />
          </UFormField>
          <UFormField :label="$t('common.description')" name="description">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="subtle" color="neutral" @click="requestCloseEdit">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saving" @click="editFormRef?.submit()">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Range edit slideover -->
    <USlideover :open="showRangeEdit" @update:open="handleRangeEditOpenChange">
      <template #title>
        <div class="flex items-center gap-2">
          <UBadge :color="rangeTypeBadgeColor(rangeEditForm.type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${rangeEditForm.type}`) }}</UBadge>
          <span>{{ rangeEditTarget?.start_ip }} – {{ rangeEditTarget?.end_ip }}</span>
        </div>
      </template>

      <template #body>
        <dl v-if="!canEditInfrastructure && rangeEditTarget" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.ranges.fields.startIp') }}</dt>
            <dd class="mt-1 font-mono text-sm text-highlighted">{{ rangeEditTarget.start_ip }}</dd>
          </div>
          <div>
            <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.ranges.fields.endIp') }}</dt>
            <dd class="mt-1 font-mono text-sm text-highlighted">{{ rangeEditTarget.end_ip }}</dd>
          </div>
          <div>
            <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('networks.ranges.fields.type') }}</dt>
            <dd class="mt-1 text-sm text-highlighted">{{ $t(`networks.ranges.types.${rangeEditTarget.type}`) }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-[10px] font-medium uppercase tracking-wider text-muted">{{ $t('common.description') }}</dt>
            <dd class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ rangeEditTarget.description || '-' }}</dd>
          </div>
        </dl>
        <div v-else-if="canEditInfrastructure && rangeEditError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ rangeEditError }}
        </div>
        <form v-if="canEditInfrastructure" class="space-y-4" @submit.prevent="onSaveRangeEdit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('networks.ranges.fields.startIp')" required>
              <UInput v-model="rangeEditForm.start_ip" required class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.ranges.fields.endIp')" required>
              <UInput v-model="rangeEditForm.end_ip" required class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="$t('networks.ranges.fields.type')" required>
            <USelect v-model="rangeEditForm.type" :items="rangeTypeOptions" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UInput v-model="rangeEditForm.description" class="w-full" />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div v-if="canEditInfrastructure" class="flex items-center justify-between">
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" @click="openDeleteRangeDialog(rangeEditTarget!)">
            {{ $t('common.delete') }}
          </UButton>
          <div class="flex gap-2">
            <UButton variant="subtle" color="neutral" @click="requestCloseRangeEdit">{{ $t('common.cancel') }}</UButton>
            <UButton :loading="savingRangeEdit" @click="onSaveRangeEdit">{{ $t('common.save') }}</UButton>
          </div>
        </div>
        <div v-else class="flex justify-end">
          <UButton variant="subtle" color="neutral" @click="closeRangeInspector">{{ $t('common.close') }}</UButton>
        </div>
      </template>
    </USlideover>

    <NetworkAllocationForm
      v-if="canEditInfrastructure || (showAddPanel && !!editAllocTarget)"
      v-model:mode="addPanelMode"
      v-model:alloc-form="allocForm"
      v-model:range-form="rangeForm"
      :open="showAddPanel"
      :readonly="!canEditInfrastructure"
      :edit-target="editAllocTarget"
      :error="addPanelError"
      :saving="addPanelMode === 'ip' ? creatingAlloc : creatingRange"
      :is-special-net="isSpecialNet"
      :device-type-options="deviceTypeOptions"
      :alloc-status-options="allocStatusOptions"
      :range-type-options="rangeTypeOptions"
      @update:open="handleAddOpenChange"
      @submit-allocation="onCreateAllocation"
      @submit-range="onCreateRange"
      @delete-alloc="openDeleteAllocDialog(editAllocTarget!)"
      @close="handleAddClose"
    />

    <SharedConfirmDialog v-if="canEditInfrastructure" v-model="showDeleteDialog" :title="$t('networks.delete')" :message="deleteNetworkTarget ? `${$t('networks.delete')}: ${deleteNetworkTarget.name} (${deleteNetworkTarget.subnet})?` : ''" :loading="deleting" @confirm="confirmDeleteNetwork" />
    <SharedConfirmDialog
      v-if="canEditInfrastructure"
      v-model="showDeleteAllocDialog"
      :title="$t('networks.allocations.title')"
      :message="deleteAllocTarget
        ? (allocDeleteRefs.length > 0 && allocDeleteRefs[0] !== '(could not check port references)'
          ? `${$t('common.delete')}: ${deleteAllocTarget.ip_address}? — ${$t('networks.allocations.deleteWithRefs', {
              count: allocDeleteRefs.length,
              ports: allocDeleteRefs.length <= 5
                ? allocDeleteRefs.join(', ')
                : allocDeleteRefs.slice(0, 5).join(', ') + ` +${allocDeleteRefs.length - 5} ${t('common.more')}`
            })}`
          : `${$t('common.delete')}: ${deleteAllocTarget.ip_address}?`)
        : ''"
      :loading="deletingAlloc"
      @confirm="confirmDeleteAlloc"
      @update:model-value="(v) => { if (!v) allocDeleteRefs = [] }"
    />
    <SharedConfirmDialog v-if="canEditInfrastructure" v-model="showDeleteRangeDialog" :title="$t('networks.ranges.title')" :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''" :loading="deletingRange" @confirm="confirmDeleteRange" />
  </div>
</template>

<script setup lang="ts">
import type { Network } from '~~/types/network'
import type { IPAllocation, AllocationStatus, DeviceType } from '~~/types/ipAllocation'
import type { IPRange, RangeType } from '~~/types/ipRange'

const { t } = useI18n()
const toast = useToast()
const { authResolved, canEditInfrastructure, handleInfrastructureForbidden } = useAuth()
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const router = useRouter()
const networkId = route.params.id as string
const { update: updateNetwork, remove: removeNetwork } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()
const { items: allocations, fetch: fetchAllocations, create: createAllocation, update: updateAllocation, remove: removeAllocation } = useIpAllocations(networkId)
const { items: ranges, fetch: fetchRanges, create: createRange, update: updateRange, remove: removeRange } = useIpRanges(networkId)

const pageLoading = ref(true)
const network = ref<Network | null>(null)
const deleteNetworkTarget = ref<Network | null>(null)
let permissionGeneration = 0
let accessChangeNoticeShown = false

function noticeAccessChanged() {
  if (accessChangeNoticeShown) return
  accessChangeNoticeShown = true
  toast.add({ title: t('permissions.accessChanged'), color: 'warning' })
}

useHead({ title: computed(() => network.value?.name || t('networks.title')) })
const editing = ref(false)
const editFormRef = ref<{ submit: () => void } | null>(null)
const saving = ref(false)
const showDetails = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const showAddPanel = ref(false)
const addPanelMode = ref<'ip' | 'range'>('ip')
const addPanelError = ref('')
const creatingAlloc = ref(false)
const showDeleteAllocDialog = ref(false)
const deleteAllocTarget = ref<IPAllocation | null>(null)
const deletingAlloc = ref(false)
const allocDeleteRefs = ref<string[]>([])

const creatingRange = ref(false)
const showDeleteRangeDialog = ref(false)
const deleteRangeTarget = ref<IPRange | null>(null)
const deletingRange = ref(false)

// Range edit slideover
const showRangeEdit = ref(false)
const rangeEditTarget = ref<IPRange | null>(null)
const rangeEditForm = ref({ start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' })
const rangeEditError = ref('')
const savingRangeEdit = ref(false)

const editAllocTarget = ref<IPAllocation | null>(null)

const editForm = ref({ name: '', subnet: '', gateway: '', vlan_id: '', description: '', exclude_from_utilization: false })
const editDnsInput = ref('')
const allocForm = ref({ ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' as AllocationStatus })
const rangeForm = ref({ start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' })

// Unsaved-changes guards for the three edit slideovers on this page.
const {
  takeSnapshot: snapshotEdit, requestClose: requestCloseEdit, onOpenChange: onEditOpenChange
} = useSlideoverGuard(
  () => ({ ...editForm.value, dns: editDnsInput.value }),
  () => { editing.value = false }
)
const {
  takeSnapshot: snapshotRangeEdit, requestClose: requestCloseRangeEdit, onOpenChange: onRangeEditOpenChange
} = useSlideoverGuard(
  rangeEditForm,
  () => { showRangeEdit.value = false }
)
// Add panel hosts either the IP allocation form or the range form, by mode.
const {
  takeSnapshot: snapshotAdd, requestClose: requestCloseAdd, onOpenChange: onAddOpenChange
} = useSlideoverGuard(
  () => (addPanelMode.value === 'ip' ? allocForm.value : rangeForm.value),
  () => { showAddPanel.value = false; editAllocTarget.value = null }
)

function closeAddPanel() {
  showAddPanel.value = false
  editAllocTarget.value = null
  addPanelError.value = ''
  allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
  rangeForm.value = { start_ip: '', end_ip: '', type: 'static', description: '' }
}

function handleAddClose() {
  if (!authResolved.value || !canEditInfrastructure.value) {
    closeAddPanel()
    return
  }
  requestCloseAdd()
}

function handleAddOpenChange(open: boolean) {
  if (!open && (!authResolved.value || !canEditInfrastructure.value)) {
    closeAddPanel()
    return
  }
  onAddOpenChange(open)
}

function closeRangeInspector() {
  showRangeEdit.value = false
  rangeEditTarget.value = null
  rangeEditError.value = ''
}

function handleRangeEditOpenChange(open: boolean) {
  if (!open && (!authResolved.value || !canEditInfrastructure.value)) {
    closeRangeInspector()
    return
  }
  onRangeEditOpenChange(open)
}

const utilizationPercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  return Math.round((allocations.value.length / subnetInfo.value.usableHosts) * 100)
})

const dhcpRangePercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  let dhcpIps = 0
  for (const r of ranges.value) {
    if (r.type === 'dhcp') {
      dhcpIps += ipToLong(r.end_ip) - ipToLong(r.start_ip) + 1
    }
  }
  return Math.round((dhcpIps / subnetInfo.value.usableHosts) * 100)
})

const reservedRangePercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  let reservedIps = 0
  for (const r of ranges.value) {
    if (r.type === 'reserved') {
      reservedIps += ipToLong(r.end_ip) - ipToLong(r.start_ip) + 1
    }
  }
  return Math.round((reservedIps / subnetInfo.value.usableHosts) * 100)
})

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))
watch(network, (n) => { if (n?.name) breadcrumbOverrides.value[`/sites/${siteId.value}/subnets/${networkId}`] = n.name }, { immediate: true })

const vlanOptions = computed(() => {
  const opts: { label: string; value: string }[] = []
  vlans.value.forEach((v) => { opts.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }) })
  return opts
})

const associatedVlan = computed(() => {
  if (!network.value?.vlan_id) return null
  return vlans.value.find((v) => v.id === network.value!.vlan_id) ?? null
})

const deviceTypeOptions = computed(() => [
  { label: t('networks.allocations.deviceTypes.server'), value: 'server' },
  { label: t('networks.allocations.deviceTypes.switch'), value: 'switch' },
  { label: t('networks.allocations.deviceTypes.router'), value: 'router' },
  { label: t('networks.allocations.deviceTypes.firewall'), value: 'firewall' },
  { label: t('networks.allocations.deviceTypes.printer'), value: 'printer' },
  { label: t('networks.allocations.deviceTypes.phone'), value: 'phone' },
  { label: t('networks.allocations.deviceTypes.ap'), value: 'ap' },
  { label: t('networks.allocations.deviceTypes.camera'), value: 'camera' },
  { label: t('networks.allocations.deviceTypes.other'), value: 'other' }
])
const allocStatusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('networks.allocations.statuses.reserved'), value: 'reserved' },
  { label: t('common.inactive'), value: 'inactive' }
])
const rangeTypeOptions = computed(() => [
  { label: t('networks.ranges.types.dhcp'), value: 'dhcp' },
  { label: t('networks.ranges.types.static'), value: 'static' },
  { label: t('networks.ranges.types.reserved'), value: 'reserved' }
])


const subnetInfo = computed(() => parseSubnetInfo(network.value?.subnet ?? ''))

const isPointToPoint = computed(() => subnetInfo.value.prefix === 31)
const isHostRoute = computed(() => subnetInfo.value.prefix === 32)
const isSpecialNet = computed(() => isPointToPoint.value || isHostRoute.value)

// Unified list computed
interface UnifiedRow {
  key: string
  kind: 'fixed' | 'allocation' | 'range'
  sortIp: number
  ip?: string
  label?: string
  data?: IPAllocation | IPRange
}

const unifiedList = computed<UnifiedRow[]>(() => {
  const rows: UnifiedRow[] = []
  const info = subnetInfo.value

  // Fixed rows — context-dependent labels for special subnets
  if (info.network !== '-') {
    const netLabel = isHostRoute.value
      ? t('networks.unified.hostAddress')
      : isPointToPoint.value
        ? t('networks.unified.endpointA')
        : t('networks.unified.networkAddress')
    rows.push({ key: 'net', kind: 'fixed', sortIp: ipToLong(info.network), ip: info.network, label: netLabel })
  }
  if (network.value?.gateway) {
    rows.push({ key: 'gw', kind: 'fixed', sortIp: ipToLong(network.value.gateway), ip: network.value.gateway, label: t('networks.unified.gateway') })
  }
  if (info.broadcast !== '-' && !isHostRoute.value) {
    const bcLabel = isPointToPoint.value
      ? t('networks.unified.endpointB')
      : t('networks.unified.broadcast')
    rows.push({ key: 'bc', kind: 'fixed', sortIp: ipToLong(info.broadcast), ip: info.broadcast, label: bcLabel })
  }

  // Allocation rows
  for (const a of allocations.value) {
    rows.push({ key: `alloc-${a.id}`, kind: 'allocation', sortIp: ipToLong(a.ip_address), data: a })
  }

  // Range rows
  for (const r of ranges.value) {
    rows.push({ key: `range-${r.id}`, kind: 'range', sortIp: ipToLong(r.start_ip), data: r })
  }

  rows.sort((a, b) => a.sortIp - b.sortIp)
  return rows
})

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

function rangeTypeBadgeColor(type: string): BadgeColor {
  if (type === 'dhcp') return 'info'
  if (type === 'static') return 'success'
  return 'warning'
}

function formatDns(servers: string[]): string {
  if (servers.length <= 3) return servers.join(', ')
  return servers.slice(0, 2).join(', ') + ` +${servers.length - 2}`
}

// Selection tracking for master-detail
const selectedRowKey = computed(() => {
  if (showAddPanel.value && editAllocTarget.value) return `alloc-${editAllocTarget.value.id}`
  if (showRangeEdit.value && rangeEditTarget.value) return `range-${rangeEditTarget.value.id}`
  return null
})

function rowClass(row: UnifiedRow): string {
  const isSelected = selectedRowKey.value === row.key
  if (row.kind === 'fixed') {
    return 'bg-elevated'
  }
  if (row.kind === 'range') {
    const type = (row.data as IPRange | undefined)?.type
    if (isSelected) return 'cursor-pointer border-l-2 border-l-primary-500 bg-primary-500/10 dark:bg-primary-500/10'
    if (type === 'dhcp') return 'cursor-pointer border-l-2 border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/5 hover:bg-blue-500/10 dark:hover:bg-blue-500/10'
    if (type === 'static') return 'cursor-pointer border-l-2 border-l-green-500 bg-green-500/5 dark:bg-green-500/5 hover:bg-green-500/10 dark:hover:bg-green-500/10'
    if (type === 'reserved') return 'cursor-pointer border-l-2 border-l-yellow-500 bg-yellow-500/5 dark:bg-yellow-500/5 hover:bg-yellow-500/10 dark:hover:bg-yellow-500/10'
  }
  if (isSelected) return 'cursor-pointer bg-primary-500/10 dark:bg-primary-500/10'
  return 'cursor-pointer row-hover'
}

function onRowClick(row: UnifiedRow) {
  if (row.kind === 'fixed') return
  if (row.kind === 'allocation') openEditAlloc(row.data as IPAllocation)
  if (row.kind === 'range') openRangeEdit(row.data as IPRange)
}

function openAddPanel() {
  if (!authResolved.value || !canEditInfrastructure.value) return
  editAllocTarget.value = null
  addPanelError.value = ''
  allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
  rangeForm.value = { start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' }
  showAddPanel.value = true
  snapshotAdd()
}

function countAllocsInRange(range: IPRange): number {
  const start = ipToLong(range.start_ip)
  const end = ipToLong(range.end_ip)
  return allocations.value.filter(a => {
    const ip = ipToLong(a.ip_address)
    return ip >= start && ip <= end
  }).length
}

function openRangeEdit(range: IPRange) {
  rangeEditTarget.value = range
  rangeEditForm.value = {
    start_ip: range.start_ip,
    end_ip: range.end_ip,
    type: range.type,
    description: range.description || ''
  }
  rangeEditError.value = ''
  showRangeEdit.value = true
  if (authResolved.value && canEditInfrastructure.value) snapshotRangeEdit()
}

function startEdit() {
  if (!authResolved.value || !canEditInfrastructure.value || !network.value) return
  editForm.value = {
    name: network.value.name,
    subnet: network.value.subnet,
    gateway: network.value.gateway || '',
    vlan_id: network.value.vlan_id || '',
    description: network.value.description || '',
    exclude_from_utilization: network.value.exclude_from_utilization
  }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
  snapshotEdit()
}

function openDeleteNetwork() {
  if (!authResolved.value || !canEditInfrastructure.value || !network.value) return
  deleteNetworkTarget.value = network.value
  showDeleteDialog.value = true
}

function validate(state: typeof editForm.value) {
  const errors: { name: string; message: string }[] = []
  if (!state.name?.trim()) {
    errors.push({ name: 'name', message: t('networks.validation.nameRequired') })
  }
  if (!state.subnet?.trim()) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetRequired') })
  } else if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(state.subnet.trim())) {
    errors.push({ name: 'subnet', message: t('networks.validation.subnetFormat') })
  }
  if (state.gateway?.trim() && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(state.gateway.trim())) {
    errors.push({ name: 'gateway', message: t('networks.validation.gatewayFormat') })
  }
  return errors
}

async function onSave() {
  if (!authResolved.value || !canEditInfrastructure.value || !network.value) return
  const generation = permissionGeneration
  const targetId = network.value.id
  saving.value = true
  try {
    const dnsServers = editDnsInput.value ? editDnsInput.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    await updateNetwork(networkId, {
      name: editForm.value.name.trim(),
      subnet: editForm.value.subnet.trim(),
      gateway: editForm.value.gateway.trim() || undefined,
      dns_servers: dnsServers,
      vlan_id: editForm.value.vlan_id || undefined,
      description: editForm.value.description.trim() || undefined,
      exclude_from_utilization: editForm.value.exclude_from_utilization
    }, siteId.value)
    if (generation !== permissionGeneration || !canEditInfrastructure.value || network.value?.id !== targetId || !editing.value) return
    toast.add({ title: t('networks.messages.updated'), color: 'success' })
    editing.value = false
    await loadNetwork(generation, targetId)
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !editing.value || network.value?.id !== targetId) return
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  }
  finally { saving.value = false }
}

async function confirmDeleteNetwork() {
  if (!authResolved.value || !canEditInfrastructure.value || !deleteNetworkTarget.value || !showDeleteDialog.value) return
  const generation = permissionGeneration
  const target = deleteNetworkTarget.value
  deleting.value = true
  try {
    await removeNetwork(target.id, siteId.value)
    if (generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteDialog.value || deleteNetworkTarget.value?.id !== target.id) return
    toast.add({ title: t('networks.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    deleteNetworkTarget.value = null
    await router.push(`/sites/${siteId.value}/subnets`)
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteDialog.value || deleteNetworkTarget.value?.id !== target.id) return
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  }
  finally { deleting.value = false }
}

async function onCreateAllocation() {
  if (!authResolved.value || !canEditInfrastructure.value || !showAddPanel.value || addPanelMode.value !== 'ip') return
  const generation = permissionGeneration
  const target = editAllocTarget.value
  addPanelError.value = ''
  creatingAlloc.value = true
  const body = {
    ip_address: allocForm.value.ip_address.trim(),
    hostname: allocForm.value.hostname.trim() || undefined,
    mac_address: allocForm.value.mac_address.trim() || undefined,
    device_type: (allocForm.value.device_type || undefined) as DeviceType | undefined,
    description: allocForm.value.description.trim() || undefined,
    status: allocForm.value.status
  }
  try {
    if (target) {
      await updateAllocation(target.id, body)
      if (generation !== permissionGeneration || !canEditInfrastructure.value || !showAddPanel.value || editAllocTarget.value?.id !== target.id) return
      toast.add({ title: t('networks.allocations.messages.updated'), color: 'success' })
    } else {
      await createAllocation(body)
      if (generation !== permissionGeneration || !canEditInfrastructure.value || !showAddPanel.value || editAllocTarget.value) return
      toast.add({ title: t('networks.allocations.messages.created'), color: 'success' })
    }
    showAddPanel.value = false
    editAllocTarget.value = null
    allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' as AllocationStatus }
    await fetchAllocations()
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !showAddPanel.value || addPanelMode.value !== 'ip' || (target ? editAllocTarget.value?.id !== target.id : !!editAllocTarget.value)) return
    const error = err as { data?: { message?: string } }
    addPanelError.value = error?.data?.message || t('errors.serverError')
  }
  finally { creatingAlloc.value = false }
}

function openEditAlloc(a: IPAllocation) {
  editAllocTarget.value = a
  allocForm.value = {
    ip_address: a.ip_address,
    hostname: a.hostname || '',
    mac_address: a.mac_address || '',
    device_type: a.device_type || '',
    description: a.description || '',
    status: a.status || 'active'
  }
  addPanelMode.value = 'ip'
  addPanelError.value = ''
  showAddPanel.value = true
  if (authResolved.value && canEditInfrastructure.value) snapshotAdd()
}

function openDeleteRange(r: IPRange) {
  if (!authResolved.value || !canEditInfrastructure.value) return
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
}

async function checkAllocationRefs(allocId: string): Promise<string[]> {
  try {
    const data = await $fetch<{ ports?: { switch_name: string; port_label: string }[] }>(`/api/networks/${networkId}/allocations/${allocId}/references`)
    return (data.ports || []).map((p) => `${p.switch_name} ${p.port_label}`)
  } catch {
    return ['(could not check port references)']
  }
}

async function openDeleteAllocDialog(a: IPAllocation) {
  if (!authResolved.value || !canEditInfrastructure.value) return
  const generation = permissionGeneration
  deleteAllocTarget.value = a
  showDeleteAllocDialog.value = false
  const refs = await checkAllocationRefs(a.id)
  if (generation !== permissionGeneration || !canEditInfrastructure.value || deleteAllocTarget.value?.id !== a.id) return
  allocDeleteRefs.value = refs
  showDeleteAllocDialog.value = true
}

async function confirmDeleteAlloc() {
  if (!authResolved.value || !canEditInfrastructure.value || !deleteAllocTarget.value || !showDeleteAllocDialog.value) return
  const generation = permissionGeneration
  const target = deleteAllocTarget.value
  deletingAlloc.value = true
  try {
    await removeAllocation(target.id)
    if (generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteAllocDialog.value || deleteAllocTarget.value?.id !== target.id) return
    toast.add({ title: t('networks.allocations.messages.deleted'), color: 'success' })
    showDeleteAllocDialog.value = false
    deleteAllocTarget.value = null
    allocDeleteRefs.value = []
    await fetchAllocations()
  }
  catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteAllocDialog.value || deleteAllocTarget.value?.id !== target.id) return
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  }
  finally { deletingAlloc.value = false }
}

async function onCreateRange() {
  if (!authResolved.value || !canEditInfrastructure.value || !showAddPanel.value || addPanelMode.value !== 'range') return
  const generation = permissionGeneration
  addPanelError.value = ''
  creatingRange.value = true
  try {
    await createRange({ start_ip: rangeForm.value.start_ip.trim(), end_ip: rangeForm.value.end_ip.trim(), type: rangeForm.value.type, description: rangeForm.value.description.trim() || undefined })
    if (generation !== permissionGeneration || !canEditInfrastructure.value || !showAddPanel.value || addPanelMode.value !== 'range') return
    toast.add({ title: t('networks.ranges.messages.created'), color: 'success' })
    showAddPanel.value = false
    rangeForm.value = { start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' }
    await fetchRanges()
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !showAddPanel.value || addPanelMode.value !== 'range') return
    const error = err as { data?: { message?: string } }
    addPanelError.value = error?.data?.message || t('errors.serverError')
  }
  finally { creatingRange.value = false }
}

function openDeleteRangeDialog(r: IPRange) {
  if (!authResolved.value || !canEditInfrastructure.value) return
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
  showRangeEdit.value = false
}

async function confirmDeleteRange() {
  if (!authResolved.value || !canEditInfrastructure.value || !deleteRangeTarget.value || !showDeleteRangeDialog.value) return
  const generation = permissionGeneration
  const target = deleteRangeTarget.value
  deletingRange.value = true
  try {
    await removeRange(target.id)
    if (generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteRangeDialog.value || deleteRangeTarget.value?.id !== target.id) return
    toast.add({ title: t('networks.ranges.messages.deleted'), color: 'success' })
    showDeleteRangeDialog.value = false
    deleteRangeTarget.value = null
    await fetchRanges()
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || !showDeleteRangeDialog.value || deleteRangeTarget.value?.id !== target.id) return
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  }
  finally { deletingRange.value = false }
}

async function onSaveRangeEdit() {
  if (!authResolved.value || !canEditInfrastructure.value || !rangeEditTarget.value || !showRangeEdit.value) return
  const generation = permissionGeneration
  const target = rangeEditTarget.value
  rangeEditError.value = ''
  savingRangeEdit.value = true
  try {
    await updateRange(target.id, {
      start_ip: rangeEditForm.value.start_ip.trim(),
      end_ip: rangeEditForm.value.end_ip.trim(),
      type: rangeEditForm.value.type,
      description: rangeEditForm.value.description.trim() || undefined
    })
    if (generation !== permissionGeneration || !canEditInfrastructure.value || rangeEditTarget.value?.id !== target.id || !showRangeEdit.value) return
    toast.add({ title: t('networks.ranges.messages.updated'), color: 'success' })
    showRangeEdit.value = false
    await fetchRanges()
  } catch (err: unknown) {
    const access = await handleInfrastructureForbidden(err)
    if (access === 'demoted') {
      noticeAccessChanged()
      return
    }
    if (access === 'already-handled' || generation !== permissionGeneration || !canEditInfrastructure.value || rangeEditTarget.value?.id !== target.id || !showRangeEdit.value) return
    const error = err as { data?: { message?: string } }
    rangeEditError.value = error?.data?.message || t('errors.serverError')
  }
  finally { savingRangeEdit.value = false }
}

async function loadNetwork(expectedGeneration?: number, expectedNetworkId?: string) {
  const mayApply = () => expectedGeneration === undefined || (
    expectedGeneration === permissionGeneration &&
    canEditInfrastructure.value &&
    network.value?.id === expectedNetworkId
  )
  if (!mayApply()) return
  pageLoading.value = true
  try {
    const fresh = await $fetch<Network>(`/api/networks/${networkId}`, { params: { siteId: siteId.value } })
    if (mayApply()) network.value = fresh
  } catch {
    if (mayApply()) {
      toast.add({ title: t('errors.notFound'), color: 'error' })
      await router.push(`/sites/${siteId.value}/subnets`)
    }
  } finally {
    // Always clear the loading flag when this request settles (a role loss during the reload
    // must not leave a permanent spinner); data, error toast and navigation stay gated above.
    pageLoading.value = false
  }
}

function resetRangeEditFromTarget(range: IPRange) {
  rangeEditTarget.value = range
  rangeEditForm.value = {
    start_ip: range.start_ip,
    end_ip: range.end_ip,
    type: range.type,
    description: range.description || ''
  }
  rangeEditError.value = ''
}

watch(canEditInfrastructure, (canEdit, wasEditable) => {
  if (!authResolved.value || canEdit === wasEditable) return

  permissionGeneration++
  if (canEdit) {
    accessChangeNoticeShown = false
    if (showAddPanel.value && editAllocTarget.value) {
      openEditAlloc(editAllocTarget.value)
      snapshotAdd()
    }
    if (showRangeEdit.value && rangeEditTarget.value) {
      resetRangeEditFromTarget(rangeEditTarget.value)
      snapshotRangeEdit()
    }
    return
  }

  // A revoked editor is discarded without a dirty-close prompt. Keep existing
  // allocation/range selections open as read-only inspectors, not stale forms.
  editing.value = false
  editForm.value = { name: '', subnet: '', gateway: '', vlan_id: '', description: '', exclude_from_utilization: false }
  editDnsInput.value = ''
  showDeleteDialog.value = false
  deleteNetworkTarget.value = null

  const selectedAllocation = editAllocTarget.value ?? deleteAllocTarget.value
  showDeleteAllocDialog.value = false
  deleteAllocTarget.value = null
  allocDeleteRefs.value = []
  if (selectedAllocation) {
    openEditAlloc(selectedAllocation)
  } else if (showAddPanel.value) {
    closeAddPanel()
  }
  addPanelError.value = ''
  if (editAllocTarget.value) snapshotAdd()

  const selectedRange = showDeleteRangeDialog.value
    ? deleteRangeTarget.value
    : showRangeEdit.value
      ? rangeEditTarget.value
      : deleteRangeTarget.value
  showDeleteRangeDialog.value = false
  deleteRangeTarget.value = null
  if (selectedRange) {
    resetRangeEditFromTarget(selectedRange)
    showRangeEdit.value = true
    snapshotRangeEdit()
  } else if (showRangeEdit.value) {
    closeRangeInspector()
  }
}, { flush: 'sync' })

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

onMounted(async () => { await Promise.all([loadNetwork(), fetchVlans(siteParams.value), fetchAllocations(), fetchRanges()]) })
</script>
