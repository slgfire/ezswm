<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" :to="`/sites/${siteId}/networks`" />
        <h1 class="text-xl font-bold">{{ network?.name || $t('common.loading') }}</h1>
      </div>
      <div v-if="network" class="flex items-center gap-1">
        <UButton icon="i-heroicons-pencil" variant="ghost" color="primary" size="sm" :title="$t('common.edit')" @click="startEdit()" />
        <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="sm" :title="$t('common.delete')" @click="showDeleteDialog = true" />
      </div>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="network" class="space-y-5">
      <NetworkInfoBar
        :network="network"
        :subnet-info="subnetInfo"
        :is-point-to-point="isPointToPoint"
        :is-host-route="isHostRoute"
        :associated-vlan="associatedVlan"
        :allocations-count="allocations.length"
        :utilization-percent="utilizationPercent"
        v-model:show-details="showDetails"
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
          <h2 class="text-base font-semibold text-gray-700 dark:text-gray-300">{{ $t('networks.unified.title') }}</h2>
          <UButton icon="i-heroicons-plus" size="sm" @click="openAddPanel()">
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
            @click="onRowClick(row)"
          >
            <!-- Fixed rows (network, gateway, broadcast) -->
            <template v-if="row.kind === 'fixed'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="row.ip!"><code class="font-mono text-xs text-gray-500 dark:text-gray-400">{{ row.ip }}</code></SharedCopyButton>
              </div>
              <div class="flex-1">
                <span class="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ row.label }}</span>
              </div>
            </template>

            <!-- Allocation rows -->
            <template v-else-if="row.kind === 'allocation'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="(row.data as IPAllocation).ip_address"><code class="font-mono text-xs text-gray-900 dark:text-white">{{ (row.data as IPAllocation).ip_address }}</code></SharedCopyButton>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ (row.data as IPAllocation).hostname || (row.data as IPAllocation).ip_address }}</span>
                  <UBadge v-if="(row.data as IPAllocation).device_type" variant="subtle" color="neutral" size="sm">{{ $t(`networks.allocations.deviceTypes.${(row.data as IPAllocation).device_type}`) }}</UBadge>
                  <UBadge :color="(row.data as IPAllocation).status === 'active' ? 'success' : (row.data as IPAllocation).status === 'reserved' ? 'warning' : 'neutral'" variant="subtle" size="sm">{{ $t(`networks.allocations.statuses.${(row.data as IPAllocation).status}`) }}</UBadge>
                </div>
                <div v-if="(row.data as IPAllocation).description || (row.data as IPAllocation).mac_address" class="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                  <span v-if="(row.data as IPAllocation).description">{{ (row.data as IPAllocation).description }}</span>
                  <SharedCopyButton v-if="(row.data as IPAllocation).mac_address" :value="(row.data as IPAllocation).mac_address!"><span class="font-mono">{{ (row.data as IPAllocation).mac_address }}</span></SharedCopyButton>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openEditAlloc(row.data as IPAllocation)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteAllocDialog(row.data as IPAllocation)" />
              </div>
            </template>

            <!-- Range rows -->
            <template v-else-if="row.kind === 'range'">
              <div class="w-40 shrink-0">
                <SharedCopyButton :value="`${(row.data as IPRange).start_ip} - ${(row.data as IPRange).end_ip}`"><code class="font-mono text-sm font-medium text-gray-900 dark:text-white">{{ (row.data as IPRange).start_ip }}</code><span class="font-mono text-xs text-gray-400"> – {{ abbreviateEndIp((row.data as IPRange).start_ip, (row.data as IPRange).end_ip) }}</span></SharedCopyButton>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge :color="rangeTypeBadgeColor((row.data as IPRange).type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${(row.data as IPRange).type}`) }}</UBadge>
                  <span class="font-mono text-[11px] text-gray-400">{{ $t('networks.ranges.ipCount', { count: rangeIpCount((row.data as IPRange).start_ip, (row.data as IPRange).end_ip) }) }}</span>
                  <span v-if="(row.data as IPRange).description" class="text-xs text-gray-500 dark:text-gray-400">{{ (row.data as IPRange).description }}</span>
                  <span v-if="(row.data as IPRange).type !== 'dhcp' && countAllocsInRange(row.data as IPRange) > 0" class="text-xs text-gray-400">
                    ({{ $t('networks.ranges.ipsDocumented', { count: countAllocsInRange(row.data as IPRange) }) }})
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <UButton icon="i-heroicons-pencil-square" variant="ghost" color="primary" size="xs" @click.stop="openRangeEdit(row.data as IPRange)" />
                <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click.stop="openDeleteRange(row.data as IPRange)" />
              </div>
            </template>
          </div>
          <div v-if="unifiedList.length === 0" class="px-4 py-3">
            <p class="text-xs text-gray-500">{{ $t('common.noData') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Network edit slideover -->
    <USlideover v-model:open="editing">
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
          <UFormField :label="$t('common.description')" name="description">
            <UTextarea v-model="editForm.description" :rows="3" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="editing = false">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saving" @click="editFormRef?.submit()">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <!-- Range edit slideover -->
    <USlideover v-model:open="showRangeEdit">
      <template #title>
        <div class="flex items-center gap-2">
          <UBadge :color="rangeTypeBadgeColor(rangeEditForm.type)" variant="subtle" size="sm">{{ $t(`networks.ranges.types.${rangeEditForm.type}`) }}</UBadge>
          <span>{{ rangeEditTarget?.start_ip }} – {{ rangeEditTarget?.end_ip }}</span>
        </div>
      </template>

      <template #body>
        <div v-if="rangeEditError" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {{ rangeEditError }}
        </div>
        <form class="space-y-4" @submit.prevent="onSaveRangeEdit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="$t('networks.ranges.fields.startIp') + ' *'">
              <UInput v-model="rangeEditForm.start_ip" required class="w-full" />
            </UFormField>
            <UFormField :label="$t('networks.ranges.fields.endIp') + ' *'">
              <UInput v-model="rangeEditForm.end_ip" required class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="$t('networks.ranges.fields.type') + ' *'">
            <USelect v-model="rangeEditForm.type" :items="rangeTypeOptions" class="w-full" />
          </UFormField>
          <UFormField :label="$t('common.description')">
            <UInput v-model="rangeEditForm.description" class="w-full" />
          </UFormField>
        </form>
      </template>

      <template #footer>
        <div class="flex items-center justify-between">
          <UButton icon="i-heroicons-trash" variant="ghost" color="error" @click="openDeleteRangeDialog(rangeEditTarget!)">
            {{ $t('common.delete') }}
          </UButton>
          <div class="flex gap-2">
            <UButton variant="ghost" color="neutral" @click="showRangeEdit = false">{{ $t('common.cancel') }}</UButton>
            <UButton :loading="savingRangeEdit" @click="onSaveRangeEdit">{{ $t('common.save') }}</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <NetworkAllocationForm
      v-model:open="showAddPanel"
      v-model:mode="addPanelMode"
      :edit-target="editAllocTarget"
      :error="addPanelError"
      :saving="addPanelMode === 'ip' ? creatingAlloc : creatingRange"
      v-model:alloc-form="allocForm"
      v-model:range-form="rangeForm"
      :is-special-net="isSpecialNet"
      :device-type-options="deviceTypeOptions"
      :alloc-status-options="allocStatusOptions"
      :range-type-options="rangeTypeOptions"
      @submit-allocation="onCreateAllocation"
      @submit-range="onCreateRange"
      @delete-alloc="openDeleteAllocDialog(editAllocTarget!)"
      @close="showAddPanel = false; editAllocTarget = null"
    />

    <SharedConfirmDialog v-model="showDeleteDialog" :title="$t('networks.delete')" :message="network ? `${$t('networks.delete')}: ${network.name} (${network.subnet})?` : ''" :loading="deleting" @confirm="confirmDeleteNetwork" />
    <SharedConfirmDialog
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
    <SharedConfirmDialog v-model="showDeleteRangeDialog" :title="$t('networks.ranges.title')" :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''" :loading="deletingRange" @confirm="confirmDeleteRange" />
  </div>
</template>

<script setup lang="ts">
import type { Network } from '~~/types/network'
import type { IPAllocation, AllocationStatus, DeviceType } from '~~/types/ipAllocation'
import type { IPRange, RangeType } from '~~/types/ipRange'

const { t } = useI18n()
const toast = useToast()
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

const editForm = ref({ name: '', subnet: '', gateway: '', vlan_id: '', description: '' })
const editDnsInput = ref('')
const allocForm = ref({ ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' as AllocationStatus })
const rangeForm = ref({ start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' })

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
watch(network, (n) => { if (n?.name) breadcrumbOverrides.value[`/sites/${siteId.value}/networks/${networkId}`] = n.name }, { immediate: true })

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
  editAllocTarget.value = null
  addPanelError.value = ''
  allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
  rangeForm.value = { start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' }
  showAddPanel.value = true
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
}

function startEdit() {
  if (!network.value) return
  editForm.value = { name: network.value.name, subnet: network.value.subnet, gateway: network.value.gateway || '', vlan_id: network.value.vlan_id || '', description: network.value.description || '' }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
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
  saving.value = true
  try {
    const dnsServers = editDnsInput.value ? editDnsInput.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    await updateNetwork(networkId, { name: editForm.value.name.trim(), subnet: editForm.value.subnet.trim(), gateway: editForm.value.gateway.trim() || undefined, dns_servers: dnsServers, vlan_id: editForm.value.vlan_id || undefined, description: editForm.value.description.trim() || undefined })
    toast.add({ title: t('networks.messages.updated'), color: 'success' })
    editing.value = false
    await loadNetwork()
  } catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { saving.value = false }
}

async function confirmDeleteNetwork() {
  deleting.value = true
  try { await removeNetwork(networkId); toast.add({ title: t('networks.messages.deleted'), color: 'success' }); showDeleteDialog.value = false; await router.push(`/sites/${siteId.value}/networks`) }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deleting.value = false }
}

async function onCreateAllocation() {
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
    if (editAllocTarget.value) {
      await updateAllocation(editAllocTarget.value.id, body)
      toast.add({ title: t('networks.allocations.messages.updated'), color: 'success' })
    } else {
      await createAllocation(body)
      toast.add({ title: t('networks.allocations.messages.created'), color: 'success' })
    }
    showAddPanel.value = false
    editAllocTarget.value = null
    allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' as AllocationStatus }
    await fetchAllocations()
  } catch (err: unknown) {
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
}

function openDeleteRange(r: IPRange) {
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
  deleteAllocTarget.value = a
  allocDeleteRefs.value = await checkAllocationRefs(a.id)
  showDeleteAllocDialog.value = true
}

async function confirmDeleteAlloc() {
  if (!deleteAllocTarget.value) return
  deletingAlloc.value = true
  try {
    await removeAllocation(deleteAllocTarget.value.id)
    toast.add({ title: t('networks.allocations.messages.deleted'), color: 'success' })
    showDeleteAllocDialog.value = false
    allocDeleteRefs.value = []
    await fetchAllocations()
  }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deletingAlloc.value = false }
}

async function onCreateRange() {
  addPanelError.value = ''
  creatingRange.value = true
  try {
    await createRange({ start_ip: rangeForm.value.start_ip.trim(), end_ip: rangeForm.value.end_ip.trim(), type: rangeForm.value.type, description: rangeForm.value.description.trim() || undefined })
    toast.add({ title: t('networks.ranges.messages.created'), color: 'success' })
    showAddPanel.value = false
    rangeForm.value = { start_ip: '', end_ip: '', type: 'static' as RangeType, description: '' }
    await fetchRanges()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    addPanelError.value = error?.data?.message || t('errors.serverError')
  }
  finally { creatingRange.value = false }
}

function openDeleteRangeDialog(r: IPRange) {
  deleteRangeTarget.value = r
  showDeleteRangeDialog.value = true
  showRangeEdit.value = false
}

async function confirmDeleteRange() {
  if (!deleteRangeTarget.value) return
  deletingRange.value = true
  try { await removeRange(deleteRangeTarget.value.id); toast.add({ title: t('networks.ranges.messages.deleted'), color: 'success' }); showDeleteRangeDialog.value = false; await fetchRanges() }
  catch (err: unknown) { const error = err as { data?: { message?: string } }; toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' }) }
  finally { deletingRange.value = false }
}

async function onSaveRangeEdit() {
  if (!rangeEditTarget.value) return
  rangeEditError.value = ''
  savingRangeEdit.value = true
  try {
    await updateRange(rangeEditTarget.value.id, {
      start_ip: rangeEditForm.value.start_ip.trim(),
      end_ip: rangeEditForm.value.end_ip.trim(),
      type: rangeEditForm.value.type,
      description: rangeEditForm.value.description.trim() || undefined
    })
    toast.add({ title: t('networks.ranges.messages.updated'), color: 'success' })
    showRangeEdit.value = false
    await fetchRanges()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    rangeEditError.value = error?.data?.message || t('errors.serverError')
  }
  finally { savingRangeEdit.value = false }
}

async function loadNetwork() {
  pageLoading.value = true
  try { network.value = await $fetch<Network>(`/api/networks/${networkId}`) }
  catch { toast.add({ title: t('errors.notFound'), color: 'error' }); await router.push(`/sites/${siteId.value}/networks`) }
  finally { pageLoading.value = false }
}

const siteParams = computed(() => siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {})

onMounted(async () => { await Promise.all([loadNetwork(), fetchVlans(siteParams.value), fetchAllocations(), fetchRanges()]) })
</script>
