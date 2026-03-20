<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" to="/networks" />
        <h1 class="text-xl font-bold">{{ network?.name || $t('common.loading') }}</h1>
      </div>
      <div v-if="network" class="flex items-center gap-1">
        <UTooltip :text="showDetails ? $t('common.hideDetails') : $t('common.showDetails')">
          <UButton icon="i-heroicons-information-circle" :variant="showDetails ? 'solid' : 'ghost'" color="gray" size="sm" @click="showDetails = !showDetails" />
        </UTooltip>
        <UTooltip :text="editing ? $t('common.cancel') : $t('common.edit')">
          <UButton :icon="editing ? 'i-heroicons-x-mark' : 'i-heroicons-pencil'" :variant="editing ? 'solid' : 'ghost'" color="gray" size="sm" @click="editing ? editing = false : startEdit()" />
        </UTooltip>
        <UTooltip :text="$t('common.delete')">
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="sm" @click="showDeleteDialog = true" />
        </UTooltip>
      </div>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="network" class="space-y-5">
      <!-- Subnet stats -->
      <div class="-mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white px-5 py-3 dark:border-gray-700 dark:bg-gray-800/30">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.subnet') }}</div>
          <div class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ network.subnet }}</div>
        </div>
        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="network.gateway">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.gateway') }}</div>
          <div class="font-mono text-sm font-semibold text-gray-900 dark:text-white">{{ network.gateway }}</div>
        </div>
        <div v-if="network.gateway" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.mask') }}</div>
          <div class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.mask }}</div>
        </div>
        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.hosts') }}</div>
          <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ subnetInfo.usableHosts.toLocaleString() }}</div>
        </div>
        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div>
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.allocated') }}</div>
          <div class="text-sm font-semibold" :class="utilizationPercent > 80 ? 'text-red-500' : 'text-primary-500'">{{ allocations.length }} <span class="text-xs font-normal text-gray-400">({{ utilizationPercent }}%)</span></div>
        </div>
        <div v-if="associatedVlan" class="h-8 w-px bg-gray-200 dark:bg-gray-700" />
        <div v-if="associatedVlan">
          <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.vlan') }}</div>
          <div class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: associatedVlan.color }" />
            {{ associatedVlan.vlan_id }} <span class="font-normal text-gray-400">{{ associatedVlan.name }}</span>
          </div>
        </div>
      </div>

      <!-- Utilization bar -->
      <div class="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" style="height: 6px">
        <div
          class="h-full rounded-full transition-all"
          :class="utilizationPercent > 80 ? 'bg-red-500' : utilizationPercent > 50 ? 'bg-yellow-500' : 'bg-primary-500'"
          :style="{ width: `${Math.min(utilizationPercent, 100)}%` }"
        />
      </div>

      <!-- Details panel (toggled) -->
      <div v-show="showDetails || editing" class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/30">
        <div v-if="!editing" class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.network') }}</dt>
            <dd class="font-mono">{{ subnetInfo.network }}</dd>
          </div>
          <div>
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.broadcast') }}</dt>
            <dd class="font-mono">{{ subnetInfo.broadcast }}</dd>
          </div>
          <div v-if="network.dns_servers?.length">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.dns') }}</dt>
            <dd class="font-mono">{{ network.dns_servers.join(', ') }}</dd>
          </div>
          <div v-if="network.description" class="col-span-2 sm:col-span-3 lg:col-span-4">
            <dt class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.description') }}</dt>
            <dd>{{ network.description }}</dd>
          </div>
        </div>

        <!-- Edit form -->
        <form v-if="editing" class="space-y-4" @submit.prevent="onSave">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormGroup :label="$t('networks.fields.name') + ' *'">
              <UInput v-model="editForm.name" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.fields.subnet') + ' *'">
              <UInput v-model="editForm.subnet" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.fields.gateway')">
              <UInput v-model="editForm.gateway" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.fields.dnsServers')">
              <UInput v-model="editDnsInput" placeholder="8.8.8.8, 8.8.4.4" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.fields.vlan')">
              <USelect v-model="editForm.vlan_id" :options="vlanOptions" />
            </UFormGroup>
            <UFormGroup :label="$t('common.description')">
              <UInput v-model="editForm.description" />
            </UFormGroup>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="gray" @click="editing = false">{{ $t('common.cancel') }}</UButton>
            <UButton type="submit" :loading="saving">{{ $t('common.save') }}</UButton>
          </div>
        </form>
      </div>

      <!-- IP Allocations -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('networks.allocations.title') }}</h2>
          <UButton icon="i-heroicons-plus" size="xs" variant="soft" @click="showAllocForm = !showAllocForm">
            {{ $t('networks.allocations.create') }}
          </UButton>
        </div>

        <div v-if="showAllocForm" class="mb-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <form class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" @submit.prevent="onCreateAllocation">
            <UFormGroup :label="$t('networks.allocations.fields.ipAddress') + ' *'">
              <UInput v-model="allocForm.ip_address" placeholder="10.0.1.10" size="sm" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.hostname')">
              <UInput v-model="allocForm.hostname" size="sm" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.deviceType')">
              <USelect v-model="allocForm.device_type" :options="deviceTypeOptions" size="sm" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.status')">
              <USelect v-model="allocForm.status" :options="allocStatusOptions" size="sm" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.macAddress')">
              <UInput v-model="allocForm.mac_address" placeholder="AA:BB:CC:DD:EE:FF" size="sm" />
            </UFormGroup>
            <div class="flex items-end gap-2">
              <UButton type="submit" :loading="creatingAlloc" size="sm">{{ $t('common.add') }}</UButton>
              <UButton variant="ghost" color="gray" size="sm" @click="showAllocForm = false">{{ $t('common.cancel') }}</UButton>
            </div>
          </form>
        </div>

        <UTable v-if="allocations.length > 0" :rows="allocations" :columns="allocColumns">
          <template #ip_address-data="{ row }">
            <code class="text-xs">{{ row.ip_address }}</code>
          </template>
          <template #status-data="{ row }">
            <UBadge :color="row.status === 'active' ? 'green' : row.status === 'reserved' ? 'yellow' : 'gray'" variant="subtle">{{ row.status }}</UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click="openDeleteAllocDialog(row)" />
          </template>
        </UTable>
        <p v-else class="text-xs text-gray-500">{{ $t('common.noData') }}</p>
      </div>

      <!-- IP Ranges -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('networks.ranges.title') }}</h2>
          <UButton icon="i-heroicons-plus" size="xs" variant="soft" @click="showRangeForm = !showRangeForm">
            {{ $t('networks.ranges.create') }}
          </UButton>
        </div>

        <div v-if="showRangeForm" class="mb-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <form class="grid grid-cols-2 gap-3 sm:grid-cols-4" @submit.prevent="onCreateRange">
            <UFormGroup :label="$t('networks.ranges.fields.startIp') + ' *'">
              <UInput v-model="rangeForm.start_ip" placeholder="10.0.1.100" size="sm" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.ranges.fields.endIp') + ' *'">
              <UInput v-model="rangeForm.end_ip" placeholder="10.0.1.200" size="sm" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.ranges.fields.type') + ' *'">
              <USelect v-model="rangeForm.type" :options="rangeTypeOptions" size="sm" />
            </UFormGroup>
            <div class="flex items-end gap-2">
              <UButton type="submit" :loading="creatingRange" size="sm">{{ $t('common.add') }}</UButton>
              <UButton variant="ghost" color="gray" size="sm" @click="showRangeForm = false">{{ $t('common.cancel') }}</UButton>
            </div>
          </form>
        </div>

        <UTable v-if="ranges.length > 0" :rows="ranges" :columns="rangeColumns">
          <template #start_ip-data="{ row }"><code class="text-xs">{{ row.start_ip }}</code></template>
          <template #end_ip-data="{ row }"><code class="text-xs">{{ row.end_ip }}</code></template>
          <template #type-data="{ row }">
            <UBadge :color="row.type === 'dhcp' ? 'blue' : row.type === 'static' ? 'green' : 'yellow'" variant="subtle">{{ row.type }}</UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click="openDeleteRangeDialog(row)" />
          </template>
        </UTable>
        <p v-else class="text-xs text-gray-500">{{ $t('common.noData') }}</p>
      </div>
    </div>

    <SharedConfirmDialog v-model="showDeleteDialog" :title="$t('networks.delete')" :message="network ? `${$t('networks.delete')}: ${network.name} (${network.subnet})?` : ''" :loading="deleting" @confirm="confirmDeleteNetwork" />
    <SharedConfirmDialog v-model="showDeleteAllocDialog" :title="$t('networks.allocations.title')" :message="deleteAllocTarget ? `${$t('common.delete')}: ${deleteAllocTarget.ip_address}?` : ''" :loading="deletingAlloc" @confirm="confirmDeleteAlloc" />
    <SharedConfirmDialog v-model="showDeleteRangeDialog" :title="$t('networks.ranges.title')" :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''" :loading="deletingRange" @confirm="confirmDeleteRange" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const networkId = route.params.id as string
const { update: updateNetwork, remove: removeNetwork } = useNetworks()
const { items: vlans, fetch: fetchVlans } = useVlans()

const pageLoading = ref(true)
const network = ref<any>(null)
const editing = ref(false)
const saving = ref(false)
const showDetails = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)

const allocations = ref<any[]>([])
const showAllocForm = ref(false)
const creatingAlloc = ref(false)
const showDeleteAllocDialog = ref(false)
const deleteAllocTarget = ref<any>(null)
const deletingAlloc = ref(false)

const ranges = ref<any[]>([])
const showRangeForm = ref(false)
const creatingRange = ref(false)
const showDeleteRangeDialog = ref(false)
const deleteRangeTarget = ref<any>(null)
const deletingRange = ref(false)

const editForm = ref({ name: '', subnet: '', gateway: '', vlan_id: '', description: '' })
const editDnsInput = ref('')
const allocForm = ref({ ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' })
const rangeForm = ref({ start_ip: '', end_ip: '', type: 'static', description: '' })

const utilizationPercent = computed(() => {
  if (!subnetInfo.value.usableHosts || subnetInfo.value.usableHosts <= 0) return 0
  return Math.round((allocations.value.length / subnetInfo.value.usableHosts) * 100)
})

const breadcrumbOverrides = useState<Record<string, string>>('breadcrumb-overrides', () => ({}))
watch(network, (n) => { if (n?.name) breadcrumbOverrides.value[`/networks/${networkId}`] = n.name }, { immediate: true })

const vlanOptions = computed(() => {
  const opts: { label: string; value: string }[] = [{ label: '-', value: '' }]
  vlans.value.forEach((v: any) => { opts.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id }) })
  return opts
})

const associatedVlan = computed(() => {
  if (!network.value?.vlan_id) return null
  return vlans.value.find((v: any) => v.id === network.value.vlan_id)
})

const deviceTypeOptions = [{ label: '-', value: '' }, { label: 'Server', value: 'server' }, { label: 'Switch', value: 'switch' }, { label: 'Printer', value: 'printer' }, { label: 'Phone', value: 'phone' }, { label: 'AP', value: 'ap' }, { label: 'Camera', value: 'camera' }, { label: 'Other', value: 'other' }]
const allocStatusOptions = computed(() => [{ label: t('common.active'), value: 'active' }, { label: 'Reserved', value: 'reserved' }, { label: t('common.inactive'), value: 'inactive' }])
const rangeTypeOptions = [{ label: 'Static', value: 'static' }, { label: 'DHCP', value: 'dhcp' }, { label: 'Reserved', value: 'reserved' }]

const allocColumns = computed(() => [
  { key: 'ip_address', label: t('networks.allocations.fields.ipAddress'), sortable: true },
  { key: 'hostname', label: t('networks.allocations.fields.hostname') },
  { key: 'device_type', label: t('networks.allocations.fields.deviceType') },
  { key: 'status', label: t('networks.allocations.fields.status') },
  { key: 'actions', label: '' }
])
const rangeColumns = computed(() => [
  { key: 'start_ip', label: t('networks.ranges.fields.startIp'), sortable: true },
  { key: 'end_ip', label: t('networks.ranges.fields.endIp') },
  { key: 'type', label: t('networks.ranges.fields.type') },
  { key: 'description', label: t('common.description') },
  { key: 'actions', label: '' }
])

const subnetInfo = computed(() => {
  if (!network.value?.subnet) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const parts = network.value.subnet.split('/')
  if (parts.length !== 2) return { network: '-', broadcast: '-', mask: '-', totalHosts: 0, usableHosts: 0 }
  const prefix = parseInt(parts[1], 10)
  const ipParts = parts[0].split('.').map(Number)
  const ipNum = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0
  const maskNum = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0
  const networkNum = (ipNum & maskNum) >>> 0
  const broadcastNum = (networkNum | (~maskNum >>> 0)) >>> 0
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix <= 30 ? totalHosts - 2 : totalHosts
  const numToIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
  return { network: numToIp(networkNum), broadcast: numToIp(broadcastNum), mask: numToIp(maskNum), totalHosts, usableHosts: Math.max(0, usableHosts) }
})

function startEdit() {
  editForm.value = { name: network.value.name, subnet: network.value.subnet, gateway: network.value.gateway || '', vlan_id: network.value.vlan_id || '', description: network.value.description || '' }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
  showDetails.value = true
}

async function onSave() {
  saving.value = true
  try {
    const dnsServers = editDnsInput.value ? editDnsInput.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    await updateNetwork(networkId, { name: editForm.value.name.trim(), subnet: editForm.value.subnet.trim(), gateway: editForm.value.gateway.trim() || undefined, dns_servers: dnsServers, vlan_id: editForm.value.vlan_id || undefined, description: editForm.value.description.trim() || undefined })
    toast.add({ title: t('networks.messages.updated'), color: 'green' })
    editing.value = false
    await loadNetwork()
  } catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { saving.value = false }
}

async function confirmDeleteNetwork() {
  deleting.value = true
  try { await removeNetwork(networkId); toast.add({ title: t('networks.messages.deleted'), color: 'green' }); showDeleteDialog.value = false; await router.push('/networks') }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { deleting.value = false }
}

async function fetchAllocations() {
  try { const data = await $fetch<any>(`/api/networks/${networkId}/allocations`); allocations.value = data.data || data || [] }
  catch { allocations.value = [] }
}

async function onCreateAllocation() {
  creatingAlloc.value = true
  try {
    await $fetch(`/api/networks/${networkId}/allocations`, { method: 'POST', body: { ip_address: allocForm.value.ip_address.trim(), hostname: allocForm.value.hostname.trim() || undefined, mac_address: allocForm.value.mac_address.trim() || undefined, device_type: allocForm.value.device_type || undefined, description: allocForm.value.description.trim() || undefined, status: allocForm.value.status } })
    toast.add({ title: t('networks.allocations.messages.created'), color: 'green' })
    showAllocForm.value = false
    allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
    await fetchAllocations()
  } catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { creatingAlloc.value = false }
}

function openDeleteAllocDialog(a: any) { deleteAllocTarget.value = a; showDeleteAllocDialog.value = true }
async function confirmDeleteAlloc() {
  if (!deleteAllocTarget.value) return
  deletingAlloc.value = true
  try { await $fetch(`/api/networks/${networkId}/allocations/${deleteAllocTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: t('networks.allocations.messages.deleted'), color: 'green' }); showDeleteAllocDialog.value = false; await fetchAllocations() }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { deletingAlloc.value = false }
}

async function fetchRanges() {
  try { const data = await $fetch<any>(`/api/networks/${networkId}/ranges`); ranges.value = data.data || data || [] }
  catch { ranges.value = [] }
}

async function onCreateRange() {
  creatingRange.value = true
  try {
    await $fetch(`/api/networks/${networkId}/ranges`, { method: 'POST', body: { start_ip: rangeForm.value.start_ip.trim(), end_ip: rangeForm.value.end_ip.trim(), type: rangeForm.value.type, description: rangeForm.value.description.trim() || undefined } })
    toast.add({ title: t('networks.ranges.messages.created'), color: 'green' })
    showRangeForm.value = false
    rangeForm.value = { start_ip: '', end_ip: '', type: 'static', description: '' }
    await fetchRanges()
  } catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { creatingRange.value = false }
}

function openDeleteRangeDialog(r: any) { deleteRangeTarget.value = r; showDeleteRangeDialog.value = true }
async function confirmDeleteRange() {
  if (!deleteRangeTarget.value) return
  deletingRange.value = true
  try { await $fetch(`/api/networks/${networkId}/ranges/${deleteRangeTarget.value.id}`, { method: 'DELETE' }); toast.add({ title: t('networks.ranges.messages.deleted'), color: 'green' }); showDeleteRangeDialog.value = false; await fetchRanges() }
  catch (err: any) { toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' }) }
  finally { deletingRange.value = false }
}

async function loadNetwork() {
  pageLoading.value = true
  try { network.value = await $fetch<any>(`/api/networks/${networkId}`) }
  catch { toast.add({ title: t('errors.notFound'), color: 'red' }); await router.push('/networks') }
  finally { pageLoading.value = false }
}

onMounted(async () => { await Promise.all([loadNetwork(), fetchVlans(), fetchAllocations(), fetchRanges()]) })
</script>
