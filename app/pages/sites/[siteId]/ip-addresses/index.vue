<template>
  <div class="p-6">
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
        <USelect v-model="vlanFilter" :items="vlanFilterOptions" size="sm" class="w-48" />
        <USelect v-model="statusFilter" :items="statusFilterOptions" size="sm" class="w-40" />
        <USelect v-model="deviceTypeFilter" :items="deviceTypeFilterOptions" size="sm" class="w-44" />
      </div>

      <!-- Table -->
      <div v-if="items.length > 0" class="list-container rounded-lg bg-default">
        <UTable v-model:sorting="sorting" :data="filteredData" :columns="columns">
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
              VLAN {{ row.original.vlan_tag }}<template v-if="row.original.vlan_name"> · {{ row.original.vlan_name }}</template>
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

          <template #action-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="openEdit(row.original)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="openDelete(row.original)" />
            </div>
          </template>
        </UTable>
      </div>

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
      @close="formOpen = false"
    />

    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('ipAddresses.delete')"
      :message="deleteMessage"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { IPAllocation, IpAllocationEnriched } from '~~/types/ipAllocation'

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
    { label: t('common.all'), value: 'all' },
    { label: t('ipAddresses.filters.noVlan'), value: 'none' }
  ]
  vlans.value.forEach(v => options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }))
  return options
})
const statusFilterOptions = computed(() => [{ label: t('common.all'), value: 'all' }, ...allocStatusOptions.value])
const deviceTypeFilterOptions = computed(() => [{ label: t('common.all'), value: 'all' }, ...deviceTypeOptions.value])

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
  ...(siteId.value === 'all' ? [{ accessorKey: 'site_name', header: t('ipAddresses.fields.site') }] : []),
  { id: 'action' }
])

// --- Create / Edit ---
const formOpen = ref(false)
const editTarget = ref<IpAllocationEnriched | null>(null)
const formError = ref('')
const saving = ref(false)

function openAdd() {
  editTarget.value = null
  formError.value = ''
  formOpen.value = true
}
function openEdit(row: IpAllocationEnriched) {
  editTarget.value = row
  formError.value = ''
  formOpen.value = true
}

async function onSubmit(payload: { networkId: string; body: Partial<IPAllocation> }) {
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
    const error = err as { data?: { message?: string } }
    formError.value = error?.data?.message || t('errors.serverError')
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

function openDelete(row: IpAllocationEnriched) {
  deleteTarget.value = row
  showDeleteDialog.value = true
}
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
