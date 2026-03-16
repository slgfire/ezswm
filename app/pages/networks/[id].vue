<template>
  <div class="p-6">
    <div class="mb-6 flex items-center gap-2">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" to="/networks" />
      <h1 class="text-2xl font-bold">
        <template v-if="network">{{ network.name }}</template>
        <template v-else>{{ $t('common.loading') }}</template>
      </h1>
    </div>

    <div v-if="pageLoading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-gray-400" />
    </div>

    <div v-else-if="network" class="space-y-6">
      <!-- Network Info -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">{{ $t('common.details') }}</h2>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="!editing"
                  icon="i-heroicons-pencil-square"
                  variant="ghost"
                  size="sm"
                  @click="startEdit"
                >
                  {{ $t('common.edit') }}
                </UButton>
                <UButton
                  icon="i-heroicons-trash"
                  variant="ghost"
                  color="red"
                  size="sm"
                  @click="showDeleteDialog = true"
                >
                  {{ $t('common.delete') }}
                </UButton>
              </div>
            </div>
          </template>

          <div v-if="!editing" class="space-y-3">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="text-sm text-gray-400">{{ $t('networks.fields.name') }}</span>
                <p class="font-medium">{{ network.name }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-400">{{ $t('networks.fields.subnet') }}</span>
                <p><code class="rounded bg-gray-800 px-1.5 py-0.5 text-sm">{{ network.subnet }}</code></p>
              </div>
              <div>
                <span class="text-sm text-gray-400">{{ $t('networks.fields.gateway') }}</span>
                <p class="font-medium">{{ network.gateway || '-' }}</p>
              </div>
              <div>
                <span class="text-sm text-gray-400">{{ $t('networks.fields.vlan') }}</span>
                <p>
                  <VlanBadge
                    v-if="associatedVlan"
                    :vlan-id="associatedVlan.vlan_id"
                    :name="associatedVlan.name"
                    :color="associatedVlan.color"
                  />
                  <span v-else class="text-gray-500">-</span>
                </p>
              </div>
              <div>
                <span class="text-sm text-gray-400">{{ $t('networks.fields.dnsServers') }}</span>
                <p class="font-medium">{{ network.dns_servers?.join(', ') || '-' }}</p>
              </div>
            </div>
            <div v-if="network.description">
              <span class="text-sm text-gray-400">{{ $t('common.description') }}</span>
              <p class="font-medium">{{ network.description }}</p>
            </div>
          </div>

          <!-- Edit Form -->
          <form v-else @submit.prevent="onSave">
            <div class="space-y-4">
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
                <UTextarea v-model="editForm.description" :rows="3" />
              </UFormGroup>
            </div>
            <div class="mt-4 flex items-center gap-3">
              <UButton type="submit" :loading="saving" icon="i-heroicons-check">
                {{ $t('common.save') }}
              </UButton>
              <UButton variant="ghost" color="gray" @click="editing = false">
                {{ $t('common.cancel') }}
              </UButton>
            </div>
          </form>
        </UCard>

        <!-- Subnet Info Sidebar -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">{{ $t('networks.fields.subnet') }}</h2>
          </template>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('networks.subnetInfo.networkAddress') }}</span>
              <code>{{ subnetInfo.network }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('networks.subnetInfo.broadcastAddress') }}</span>
              <code>{{ subnetInfo.broadcast }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('networks.subnetInfo.subnetMask') }}</span>
              <code>{{ subnetInfo.mask }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('networks.subnetInfo.totalHosts') }}</span>
              <span>{{ subnetInfo.totalHosts }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">{{ $t('networks.subnetInfo.usableHosts') }}</span>
              <span>{{ subnetInfo.usableHosts }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <!-- IP Allocations -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ $t('networks.allocations.title') }}</h2>
            <UButton icon="i-heroicons-plus" size="sm" @click="showAllocForm = true">
              {{ $t('networks.allocations.create') }}
            </UButton>
          </div>
        </template>

        <!-- Add Allocation Form -->
        <div v-if="showAllocForm" class="mb-4 rounded-lg border border-gray-700 p-4">
          <form @submit.prevent="onCreateAllocation" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <UFormGroup :label="$t('networks.allocations.fields.ipAddress') + ' *'">
              <UInput v-model="allocForm.ip_address" placeholder="10.0.1.10" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.hostname')">
              <UInput v-model="allocForm.hostname" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.deviceType')">
              <USelect v-model="allocForm.device_type" :options="deviceTypeOptions" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.status')">
              <USelect v-model="allocForm.status" :options="allocStatusOptions" />
            </UFormGroup>
            <UFormGroup :label="$t('networks.allocations.fields.macAddress')" class="sm:col-span-2">
              <UInput v-model="allocForm.mac_address" placeholder="AA:BB:CC:DD:EE:FF" />
            </UFormGroup>
            <UFormGroup :label="$t('common.description')" class="sm:col-span-2">
              <UInput v-model="allocForm.description" />
            </UFormGroup>
            <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <UButton type="submit" :loading="creatingAlloc" icon="i-heroicons-check" size="sm">
                {{ $t('common.save') }}
              </UButton>
              <UButton variant="ghost" color="gray" size="sm" @click="showAllocForm = false">
                {{ $t('common.cancel') }}
              </UButton>
            </div>
          </form>
        </div>

        <UTable
          v-if="allocations.length > 0"
          :rows="allocations"
          :columns="allocColumns"
        >
          <template #ip_address-data="{ row }">
            <code class="text-sm">{{ row.ip_address }}</code>
          </template>
          <template #status-data="{ row }">
            <UBadge
              :color="row.status === 'active' ? 'green' : row.status === 'reserved' ? 'yellow' : 'gray'"
              variant="subtle"
            >
              {{ row.status }}
            </UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton
              icon="i-heroicons-trash"
              variant="ghost"
              color="red"
              size="xs"
              @click="openDeleteAllocDialog(row)"
            />
          </template>
        </UTable>
        <p v-else class="text-sm text-gray-500">{{ $t('common.noData') }}</p>
      </UCard>

      <!-- IP Ranges -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ $t('networks.ranges.title') }}</h2>
            <UButton icon="i-heroicons-plus" size="sm" @click="showRangeForm = true">
              {{ $t('networks.ranges.create') }}
            </UButton>
          </div>
        </template>

        <!-- Add Range Form -->
        <div v-if="showRangeForm" class="mb-4 rounded-lg border border-gray-700 p-4">
          <form @submit.prevent="onCreateRange" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <UFormGroup :label="$t('networks.ranges.fields.startIp') + ' *'">
              <UInput v-model="rangeForm.start_ip" placeholder="10.0.1.100" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.ranges.fields.endIp') + ' *'">
              <UInput v-model="rangeForm.end_ip" placeholder="10.0.1.200" required />
            </UFormGroup>
            <UFormGroup :label="$t('networks.ranges.fields.type') + ' *'">
              <USelect v-model="rangeForm.type" :options="rangeTypeOptions" />
            </UFormGroup>
            <UFormGroup :label="$t('common.description')">
              <UInput v-model="rangeForm.description" />
            </UFormGroup>
            <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <UButton type="submit" :loading="creatingRange" icon="i-heroicons-check" size="sm">
                {{ $t('common.save') }}
              </UButton>
              <UButton variant="ghost" color="gray" size="sm" @click="showRangeForm = false">
                {{ $t('common.cancel') }}
              </UButton>
            </div>
          </form>
        </div>

        <UTable
          v-if="ranges.length > 0"
          :rows="ranges"
          :columns="rangeColumns"
        >
          <template #start_ip-data="{ row }">
            <code class="text-sm">{{ row.start_ip }}</code>
          </template>
          <template #end_ip-data="{ row }">
            <code class="text-sm">{{ row.end_ip }}</code>
          </template>
          <template #type-data="{ row }">
            <UBadge
              :color="row.type === 'dhcp' ? 'blue' : row.type === 'static' ? 'green' : 'yellow'"
              variant="subtle"
            >
              {{ row.type }}
            </UBadge>
          </template>
          <template #actions-data="{ row }">
            <UButton
              icon="i-heroicons-trash"
              variant="ghost"
              color="red"
              size="xs"
              @click="openDeleteRangeDialog(row)"
            />
          </template>
        </UTable>
        <p v-else class="text-sm text-gray-500">{{ $t('common.noData') }}</p>
      </UCard>
    </div>

    <!-- Delete Network confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('networks.delete')"
      :message="network ? `${$t('networks.delete')}: ${network.name} (${network.subnet})?` : ''"
      :loading="deleting"
      @confirm="confirmDeleteNetwork"
    />

    <!-- Delete Allocation confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteAllocDialog"
      :title="$t('networks.allocations.title')"
      :message="deleteAllocTarget ? `${$t('common.delete')}: ${deleteAllocTarget.ip_address}?` : ''"
      :loading="deletingAlloc"
      @confirm="confirmDeleteAlloc"
    />

    <!-- Delete Range confirmation -->
    <SharedConfirmDialog
      v-model="showDeleteRangeDialog"
      :title="$t('networks.ranges.title')"
      :message="deleteRangeTarget ? `${$t('common.delete')}: ${deleteRangeTarget.start_ip} - ${deleteRangeTarget.end_ip}?` : ''"
      :loading="deletingRange"
      @confirm="confirmDeleteRange"
    />
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
const showDeleteDialog = ref(false)
const deleting = ref(false)

// Allocations
const allocations = ref<any[]>([])
const allocLoading = ref(false)
const showAllocForm = ref(false)
const creatingAlloc = ref(false)
const showDeleteAllocDialog = ref(false)
const deleteAllocTarget = ref<any>(null)
const deletingAlloc = ref(false)

// Ranges
const ranges = ref<any[]>([])
const rangesLoading = ref(false)
const showRangeForm = ref(false)
const creatingRange = ref(false)
const showDeleteRangeDialog = ref(false)
const deleteRangeTarget = ref<any>(null)
const deletingRange = ref(false)

// Edit form
const editForm = ref({ name: '', subnet: '', gateway: '', vlan_id: '', description: '' })
const editDnsInput = ref('')

// Allocation form
const allocForm = ref({
  ip_address: '',
  hostname: '',
  mac_address: '',
  device_type: '',
  description: '',
  status: 'active'
})

// Range form
const rangeForm = ref({
  start_ip: '',
  end_ip: '',
  type: 'static',
  description: ''
})

const vlanOptions = computed(() => {
  const options: { label: string; value: string }[] = [{ label: '-', value: '' }]
  vlans.value.forEach((v: any) => {
    options.push({ label: `VLAN ${v.vlan_id} - ${v.name}`, value: v.id })
  })
  return options
})

const associatedVlan = computed(() => {
  if (!network.value?.vlan_id) return null
  return vlans.value.find((v: any) => v.id === network.value.vlan_id)
})

const deviceTypeOptions = [
  { label: '-', value: '' },
  { label: 'Server', value: 'server' },
  { label: 'Switch', value: 'switch' },
  { label: 'Printer', value: 'printer' },
  { label: 'Phone', value: 'phone' },
  { label: 'AP', value: 'ap' },
  { label: 'Camera', value: 'camera' },
  { label: 'Other', value: 'other' }
]

const allocStatusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: 'Reserved', value: 'reserved' },
  { label: t('common.inactive'), value: 'inactive' }
])

const rangeTypeOptions = [
  { label: 'Static', value: 'static' },
  { label: 'DHCP', value: 'dhcp' },
  { label: 'Reserved', value: 'reserved' }
]

const allocColumns = computed(() => [
  { key: 'ip_address', label: t('networks.allocations.fields.ipAddress'), sortable: true },
  { key: 'hostname', label: t('networks.allocations.fields.hostname') },
  { key: 'device_type', label: t('networks.allocations.fields.deviceType') },
  { key: 'status', label: t('networks.allocations.fields.status') },
  { key: 'actions', label: t('common.actions') }
])

const rangeColumns = computed(() => [
  { key: 'start_ip', label: t('networks.ranges.fields.startIp'), sortable: true },
  { key: 'end_ip', label: t('networks.ranges.fields.endIp') },
  { key: 'type', label: t('networks.ranges.fields.type') },
  { key: 'description', label: t('common.description') },
  { key: 'actions', label: t('common.actions') }
])

// Subnet info calculation
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

  return {
    network: numToIp(networkNum),
    broadcast: numToIp(broadcastNum),
    mask: numToIp(maskNum),
    totalHosts,
    usableHosts: Math.max(0, usableHosts)
  }
})

function startEdit() {
  editForm.value = {
    name: network.value.name,
    subnet: network.value.subnet,
    gateway: network.value.gateway || '',
    vlan_id: network.value.vlan_id || '',
    description: network.value.description || ''
  }
  editDnsInput.value = network.value.dns_servers?.join(', ') || ''
  editing.value = true
}

async function onSave() {
  saving.value = true
  try {
    const dnsServers = editDnsInput.value ? editDnsInput.value.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    await updateNetwork(networkId, {
      name: editForm.value.name.trim(),
      subnet: editForm.value.subnet.trim(),
      gateway: editForm.value.gateway.trim() || undefined,
      dns_servers: dnsServers,
      vlan_id: editForm.value.vlan_id || undefined,
      description: editForm.value.description.trim() || undefined
    })
    toast.add({ title: t('networks.messages.updated'), color: 'green' })
    editing.value = false
    await loadNetwork()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    saving.value = false
  }
}

async function confirmDeleteNetwork() {
  deleting.value = true
  try {
    await removeNetwork(networkId)
    toast.add({ title: t('networks.messages.deleted'), color: 'green' })
    showDeleteDialog.value = false
    await router.push('/networks')
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deleting.value = false
  }
}

// Allocation CRUD
async function fetchAllocations() {
  allocLoading.value = true
  try {
    const data = await $fetch<any>(`/api/networks/${networkId}/allocations`)
    allocations.value = data.data || data || []
  } catch {
    allocations.value = []
  } finally {
    allocLoading.value = false
  }
}

async function onCreateAllocation() {
  creatingAlloc.value = true
  try {
    await $fetch(`/api/networks/${networkId}/allocations`, {
      method: 'POST',
      body: {
        ip_address: allocForm.value.ip_address.trim(),
        hostname: allocForm.value.hostname.trim() || undefined,
        mac_address: allocForm.value.mac_address.trim() || undefined,
        device_type: allocForm.value.device_type || undefined,
        description: allocForm.value.description.trim() || undefined,
        status: allocForm.value.status
      }
    })
    toast.add({ title: t('networks.allocations.messages.created'), color: 'green' })
    showAllocForm.value = false
    allocForm.value = { ip_address: '', hostname: '', mac_address: '', device_type: '', description: '', status: 'active' }
    await fetchAllocations()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    creatingAlloc.value = false
  }
}

function openDeleteAllocDialog(alloc: any) {
  deleteAllocTarget.value = alloc
  showDeleteAllocDialog.value = true
}

async function confirmDeleteAlloc() {
  if (!deleteAllocTarget.value) return
  deletingAlloc.value = true
  try {
    await $fetch(`/api/networks/${networkId}/allocations/${deleteAllocTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('networks.allocations.messages.deleted'), color: 'green' })
    showDeleteAllocDialog.value = false
    await fetchAllocations()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deletingAlloc.value = false
  }
}

// Range CRUD
async function fetchRanges() {
  rangesLoading.value = true
  try {
    const data = await $fetch<any>(`/api/networks/${networkId}/ranges`)
    ranges.value = data.data || data || []
  } catch {
    ranges.value = []
  } finally {
    rangesLoading.value = false
  }
}

async function onCreateRange() {
  creatingRange.value = true
  try {
    await $fetch(`/api/networks/${networkId}/ranges`, {
      method: 'POST',
      body: {
        start_ip: rangeForm.value.start_ip.trim(),
        end_ip: rangeForm.value.end_ip.trim(),
        type: rangeForm.value.type,
        description: rangeForm.value.description.trim() || undefined
      }
    })
    toast.add({ title: t('networks.ranges.messages.created'), color: 'green' })
    showRangeForm.value = false
    rangeForm.value = { start_ip: '', end_ip: '', type: 'static', description: '' }
    await fetchRanges()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    creatingRange.value = false
  }
}

function openDeleteRangeDialog(range: any) {
  deleteRangeTarget.value = range
  showDeleteRangeDialog.value = true
}

async function confirmDeleteRange() {
  if (!deleteRangeTarget.value) return
  deletingRange.value = true
  try {
    await $fetch(`/api/networks/${networkId}/ranges/${deleteRangeTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('networks.ranges.messages.deleted'), color: 'green' })
    showDeleteRangeDialog.value = false
    await fetchRanges()
  } catch (err: any) {
    toast.add({ title: err?.data?.message || t('errors.serverError'), color: 'red' })
  } finally {
    deletingRange.value = false
  }
}

async function loadNetwork() {
  try {
    const data = await $fetch<any>(`/api/networks/${networkId}`)
    network.value = data
  } catch {
    toast.add({ title: t('errors.notFound'), color: 'red' })
    await router.push('/networks')
  }
}

onMounted(async () => {
  pageLoading.value = true
  await Promise.all([loadNetwork(), fetchVlans(), fetchAllocations(), fetchRanges()])
  pageLoading.value = false
})
</script>
