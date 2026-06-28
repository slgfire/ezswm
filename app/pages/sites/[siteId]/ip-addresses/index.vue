<template>
  <div class="flex h-full flex-col p-6">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">{{ $t('ipAddresses.title') }}</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="openAdd">{{ $t('ipAddresses.add') }}</UButton>
    </div>

    <!-- Loading -->
    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <UInput
          v-model="search"
          icon="i-heroicons-magnifying-glass"
          :placeholder="$t('common.search')"
          size="sm"
          class="w-64"
        />
        <USelect v-model="vlanFilter" :items="vlanFilterOptions" icon="i-heroicons-tag" size="sm" class="w-48" />
        <USelect v-model="statusFilter" :items="statusFilterOptions" icon="i-heroicons-signal" size="sm" class="w-44" />
        <USelect v-model="deviceTypeFilter" :items="deviceTypeFilterOptions" icon="i-heroicons-cpu-chip" size="sm" class="w-48" />
      </div>

      <!-- Table (fills remaining height, scrolls internally with a sticky header) -->
      <UTable
        v-if="items.length > 0"
        v-model:sorting="sorting"
        sticky
        :data="filteredData"
        :columns="columns"
        :ui="{ tr: 'cursor-pointer' }"
        class="min-h-0 flex-1 rounded-lg border border-default bg-default"
        @select="onRowSelect"
      >
          <template #network_name-cell="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white">{{ row.original.network_name }}</span>
              <code class="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">{{ row.original.network_subnet }}</code>
            </div>
          </template>

          <template #vlan_tag-cell="{ row }">
            <span
              v-if="row.original.vlan_tag !== null"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
              :style="{ backgroundColor: row.original.vlan_color || '#6B7280' }"
            >
              {{ row.original.vlan_tag }}<template v-if="row.original.vlan_name"> · {{ row.original.vlan_name }}</template>
            </span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template #mac_address-cell="{ row }">
            <code v-if="row.original.mac_address" class="font-mono text-xs">{{ row.original.mac_address }}</code>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template #device_type-cell="{ row }">
            {{ optionLabel(deviceTypeOptions, row.original.device_type) }}
          </template>

          <template #status-cell="{ row }">
            <UBadge variant="subtle" :color="statusColor(row.original.status)">{{ optionLabel(allocStatusOptions, row.original.status) }}</UBadge>
          </template>

          <template #site_name-cell="{ row }">{{ row.original.site_name }}</template>
      </UTable>

      <SharedEmptyState
        v-else
        icon="i-heroicons-map-pin"
        :title="$t('ipAddresses.emptyTitle')"
        :description="$t('ipAddresses.emptyDescription')"
      >
        <template #action>
          <UButton icon="i-heroicons-plus" @click="openAdd">{{ $t('ipAddresses.add') }}</UButton>
        </template>
      </SharedEmptyState>
    </template>

    <IpAddressForm
      v-model:open="formOpen"
      :edit-target="editTarget"
      :networks="networks"
      :vlans="vlans"
      :device-type-options="deviceTypeOptions"
      :alloc-status-options="allocStatusOptions"
      :error="formError"
      :saving="saving"
      @submit="onSubmit"
      @delete="onFormDelete"
      @close="onFormClose"
    />

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('ipAddresses.delete')"
      :message="deleteMessage"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <UModal :open="showNetworkMoveDialog" @update:open="onNetworkMoveOpenChange">
      <template #title>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <UIcon name="i-heroicons-arrow-right-circle" class="h-5 w-5" />
          </div>
          <div>
            <div class="font-semibold text-highlighted">{{ $t('ipAddresses.networkMove.title') }}</div>
            <p class="mt-1 text-sm text-toned">{{ $t('ipAddresses.networkMove.description') }}</p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-5">
          <div v-if="networkMoveError" class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {{ networkMoveError }}
          </div>

          <div class="rounded-2xl border border-default/70 bg-muted/30 p-4">
            <div class="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
              <div class="text-xs font-medium uppercase tracking-[0.18em] text-toned">{{ $t('ipAddresses.networkMove.preview.ip') }}</div>
              <div class="flex items-center gap-3 text-sm">
                <code class="rounded-lg bg-default px-2 py-1 font-mono text-xs text-muted">{{ editTarget?.ip_address }}</code>
                <UIcon name="i-heroicons-arrow-long-right" class="h-4 w-4 text-primary" />
                <code class="rounded-lg bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{{ pendingMovePayload?.body.ip_address }}</code>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
              <div class="text-xs font-medium uppercase tracking-[0.18em] text-toned">{{ $t('ipAddresses.networkMove.preview.network') }}</div>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-3">
                  <div class="min-w-0 rounded-xl border border-default bg-default px-3 py-2">
                    <div class="truncate font-medium text-highlighted">{{ editTarget?.network_name }}</div>
                    <code class="mt-1 inline-block font-mono text-xs text-muted">{{ editTarget?.network_subnet }}</code>
                  </div>
                  <UIcon name="i-heroicons-arrow-long-right" class="hidden h-4 w-4 shrink-0 text-primary sm:block" />
                  <div class="min-w-0 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                    <div class="truncate font-medium text-highlighted">{{ selectedMoveCandidate?.name }}</div>
                    <code class="mt-1 inline-block font-mono text-xs text-primary">{{ selectedMoveCandidate?.subnet }}</code>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
              <div class="text-xs font-medium uppercase tracking-[0.18em] text-toned">{{ $t('ipAddresses.networkMove.preview.vlan') }}</div>
              <div class="flex items-center gap-3 text-sm">
                <span>{{ currentMoveVlanLabel }}</span>
                <UIcon name="i-heroicons-arrow-long-right" class="h-4 w-4 text-primary" />
                <span class="font-medium text-highlighted">{{ selectedMoveVlanLabel }}</span>
              </div>
            </div>
          </div>

          <UFormField
            v-if="moveCandidateOptions.length > 1"
            :label="$t('ipAddresses.networkMove.selectLabel')"
            required
          >
            <USelect v-model="selectedMoveCandidateId" :items="moveCandidateOptions" class="w-full" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="closeNetworkMoveDialog">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saving" :disabled="!selectedMoveCandidateId" @click="confirmNetworkMove">
            {{ $t('ipAddresses.networkMove.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { IPAllocation, IpAllocationEnriched } from '~~/types/ipAllocation'
import type { Network } from '~~/types/network'
import type { VLAN } from '~~/types/vlan'

interface NetworkMoveCandidate {
  id: string
  name: string
  subnet: string
}

interface IpAllocationSubmitPayload {
  networkId: string
  body: Partial<IPAllocation>
}

interface ApiError {
  data?: {
    code?: string
    message?: string
    data?: {
      code?: string
      candidates?: NetworkMoveCandidate[]
    }
    candidates?: NetworkMoveCandidate[]
  }
}

const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.siteId as string)
const { t } = useI18n()
useHead({ title: t('ipAddresses.title') })
const toast = useToast()

const { items, fetch: fetchAllocations, create, update, remove } = useSiteIpAllocations()
const { items: networks, fetch: fetchNetworks } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const UButton = resolveComponent('UButton')

const pageLoading = ref(true)
const siteParams = computed(() => (siteId.value && siteId.value !== 'all' ? { site_id: siteId.value } : {}))

// --- Options (shared by form, filters and cell labels) ---
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

function optionLabel(options: { label: string; value: string }[], value?: string | null) {
  if (!value) return '—'
  return options.find(o => o.value === value)?.label ?? value
}

type BadgeColor = 'success' | 'warning' | 'neutral'
function statusColor(status: string): BadgeColor {
  if (status === 'active') return 'success'
  if (status === 'reserved') return 'warning'
  return 'neutral'
}

// --- Filter state (synced to query + localStorage, mirrors networks/index.vue) ---
const LS_KEY = 'ezswm-ip-addresses-list'

function loadState() {
  const hasQuery = route.query.q || route.query.vlan || route.query.status || route.query.dtype
  if (hasQuery) {
    return {
      q: (route.query.q as string) || '',
      vlan: (route.query.vlan as string) || 'all',
      status: (route.query.status as string) || 'all',
      dtype: (route.query.dtype as string) || 'all'
    }
  }
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      const s = JSON.parse(saved)
      return { q: s.q || '', vlan: s.vlan || 'all', status: s.status || 'all', dtype: s.dtype || 'all' }
    }
  } catch { /* ignore */ }
  return { q: '', vlan: 'all', status: 'all', dtype: 'all' }
}

const initial = loadState()
const search = ref(initial.q)
const vlanFilter = ref(initial.vlan)
const statusFilter = ref(initial.status)
const deviceTypeFilter = ref(initial.dtype)

function syncState() {
  const query: Record<string, string> = {}
  if (search.value) query.q = search.value
  if (vlanFilter.value !== 'all') query.vlan = vlanFilter.value
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  if (deviceTypeFilter.value !== 'all') query.dtype = deviceTypeFilter.value
  router.replace({ query })
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      q: search.value, vlan: vlanFilter.value, status: statusFilter.value, dtype: deviceTypeFilter.value
    }))
  } catch { /* ignore */ }
}
watch([search, vlanFilter, statusFilter, deviceTypeFilter], syncState)

const vlanFilterOptions = computed(() => {
  const options = [
    { label: t('ipAddresses.filters.allVlans'), value: 'all' },
    { label: t('ipAddresses.filters.noVlan'), value: 'none' }
  ]
  const sorted = [...vlans.value].sort((a, b) => a.vlan_id - b.vlan_id)
  sorted.forEach(v => options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }))
  return options
})
const statusFilterOptions = computed(() => [{ label: t('ipAddresses.filters.allStatuses'), value: 'all' }, ...allocStatusOptions.value])
const deviceTypeFilterOptions = computed(() => [{ label: t('ipAddresses.filters.allDeviceTypes'), value: 'all' }, ...deviceTypeOptions.value])

const filteredData = computed(() => {
  let result = items.value
  if (vlanFilter.value === 'none') result = result.filter(r => !r.vlan_ref_id)
  else if (vlanFilter.value !== 'all') result = result.filter(r => r.vlan_ref_id === vlanFilter.value)
  if (statusFilter.value !== 'all') result = result.filter(r => r.status === statusFilter.value)
  if (deviceTypeFilter.value !== 'all') result = result.filter(r => r.device_type === deviceTypeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(r =>
      r.ip_address.toLowerCase().includes(q) ||
      (r.hostname?.toLowerCase().includes(q) ?? false) ||
      (r.mac_address?.toLowerCase().includes(q) ?? false)
    )
  }
  return result
})

// --- Table columns ---
const sorting = ref([{ id: 'ip_address', desc: false }])
const columns = computed<TableColumn<IpAllocationEnriched>[]>(() => [
  {
    accessorKey: 'ip_address',
    header: ({ column }) => h(UButton, {
      color: 'neutral',
      variant: 'ghost',
      label: t('ipAddresses.fields.ipAddress'),
      class: '-mx-2.5',
      icon: column.getIsSorted()
        ? (column.getIsSorted() === 'asc' ? 'i-heroicons-bars-arrow-up' : 'i-heroicons-bars-arrow-down')
        : 'i-heroicons-arrows-up-down',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
    }),
    sortingFn: (a, b) => ipToLong(a.getValue<string>('ip_address')) - ipToLong(b.getValue<string>('ip_address'))
  },
  { accessorKey: 'hostname', header: t('ipAddresses.fields.hostname') },
  { accessorKey: 'mac_address', header: t('ipAddresses.fields.macAddress') },
  { accessorKey: 'network_name', header: t('ipAddresses.fields.network') },
  { accessorKey: 'vlan_tag', header: t('ipAddresses.fields.vlan') },
  { accessorKey: 'device_type', header: t('ipAddresses.fields.deviceType') },
  { accessorKey: 'status', header: t('ipAddresses.fields.status') },
  ...(siteId.value === 'all' ? [{ accessorKey: 'site_name', header: t('ipAddresses.fields.site') }] : [])
])

// --- Create / Edit ---
const formOpen = ref(false)
const editTarget = ref<IpAllocationEnriched | null>(null)
const formError = ref('')
const saving = ref(false)
const showNetworkMoveDialog = ref(false)
const pendingMovePayload = ref<IpAllocationSubmitPayload | null>(null)
const moveCandidates = ref<NetworkMoveCandidate[]>([])
const selectedMoveCandidateId = ref('')
const networkMoveError = ref('')

const selectedMoveCandidate = computed(() =>
  moveCandidates.value.find(candidate => candidate.id === selectedMoveCandidateId.value) ?? null
)

const moveCandidateOptions = computed(() =>
  moveCandidates.value.map(candidate => ({
    label: `${candidate.name} (${candidate.subnet})`,
    value: candidate.id
  }))
)

function findNetworkById(networkId?: string | null): Network | null {
  if (!networkId) return null
  return networks.value.find(network => network.id === networkId) ?? null
}

function findVlanByNetwork(network: Network | null): VLAN | null {
  const vlanId = network?.vlan_id
  return vlanId ? vlans.value.find(vlan => vlan.id === vlanId) ?? null : null
}

function formatVlanLabel(vlan: VLAN | null) {
  return vlan ? `VLAN ${vlan.vlan_id} · ${vlan.name}` : '—'
}

const currentMoveVlanLabel = computed(() => {
  if (!editTarget.value || editTarget.value.vlan_tag === null) return '—'
  return editTarget.value.vlan_name
    ? `VLAN ${editTarget.value.vlan_tag} · ${editTarget.value.vlan_name}`
    : `VLAN ${editTarget.value.vlan_tag}`
})

const selectedMoveVlanLabel = computed(() =>
  formatVlanLabel(findVlanByNetwork(findNetworkById(selectedMoveCandidateId.value)))
)

function openNetworkMoveDialog(payload: IpAllocationSubmitPayload, candidates: NetworkMoveCandidate[]) {
  pendingMovePayload.value = payload
  moveCandidates.value = candidates
  selectedMoveCandidateId.value = candidates.length === 1 ? candidates[0]!.id : ''
  networkMoveError.value = ''
  showNetworkMoveDialog.value = true
}

function closeNetworkMoveDialog() {
  showNetworkMoveDialog.value = false
  pendingMovePayload.value = null
  moveCandidates.value = []
  selectedMoveCandidateId.value = ''
  networkMoveError.value = ''
}

function onNetworkMoveOpenChange(open: boolean) {
  if (open) showNetworkMoveDialog.value = true
  else closeNetworkMoveDialog()
}

function openAdd() {
  closeNetworkMoveDialog()
  editTarget.value = null
  formError.value = ''
  formOpen.value = true
}
function openEdit(row: IpAllocationEnriched) {
  closeNetworkMoveDialog()
  editTarget.value = row
  formError.value = ''
  formOpen.value = true
}
function onFormClose() {
  formOpen.value = false
  closeNetworkMoveDialog()
}
function onRowSelect(_e: Event, row: TableRow<IpAllocationEnriched>) {
  openEdit(row.original)
}

async function onSubmit(payload: IpAllocationSubmitPayload) {
  saving.value = true
  formError.value = ''
  try {
    if (editTarget.value) {
      await update(editTarget.value.network_id, editTarget.value.id, payload.body)
      toast.add({ title: t('ipAddresses.messages.updated'), color: 'success' })
    } else {
      await create(payload.networkId, payload.body)
      toast.add({ title: t('ipAddresses.messages.created'), color: 'success' })
    }
    formOpen.value = false
    editTarget.value = null
    await fetchAllocations(siteId.value)
  } catch (err: unknown) {
    const error = err as ApiError
    const moveError = error.data?.data ?? error.data
    if (editTarget.value && moveError?.code === 'IP_NETWORK_MOVE_REQUIRED' && moveError.candidates?.length) {
      openNetworkMoveDialog(payload, moveError.candidates)
      return
    }
    formError.value = error?.data?.message || t('errors.serverError')
  } finally {
    saving.value = false
  }
}

async function confirmNetworkMove() {
  if (!editTarget.value || !pendingMovePayload.value || !selectedMoveCandidateId.value) return

  saving.value = true
  formError.value = ''

  try {
    await update(editTarget.value.network_id, editTarget.value.id, {
      ...pendingMovePayload.value.body,
      network_id: selectedMoveCandidateId.value
    })
    closeNetworkMoveDialog()
    formOpen.value = false
    editTarget.value = null
    toast.add({ title: t('ipAddresses.messages.updated'), color: 'success' })
    await fetchAllocations(siteId.value)
  } catch (err: unknown) {
    const error = err as ApiError
    networkMoveError.value = error?.data?.message || t('errors.serverError')
  } finally {
    saving.value = false
  }
}

// --- Delete ---
const showDeleteDialog = ref(false)
const deleteTarget = ref<IpAllocationEnriched | null>(null)
const deleting = ref(false)
const deleteMessage = computed(() =>
  deleteTarget.value ? `${t('ipAddresses.delete')}: ${deleteTarget.value.ip_address}?` : ''
)

function onFormDelete() {
  if (editTarget.value) {
    deleteTarget.value = editTarget.value
    formOpen.value = false
    showDeleteDialog.value = true
  }
}
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await remove(deleteTarget.value.network_id, deleteTarget.value.id)
    toast.add({ title: t('ipAddresses.messages.deleted'), color: 'success' })
    showDeleteDialog.value = false
    deleteTarget.value = null
    await fetchAllocations(siteId.value)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: error?.data?.message || t('errors.serverError'), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchAllocations(siteId.value),
    fetchNetworks(siteParams.value),
    fetchVlans(siteParams.value)
  ])
  pageLoading.value = false
})
</script>
