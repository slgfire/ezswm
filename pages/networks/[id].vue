<script setup lang="ts">
import type { IpAllocation, IpAllocationStatus, IpRange, IpRangeType, Network } from '~/types/models'
import { compareIpAddresses, ipRangeSize, isIpWithinRange, prefixToNetmask } from '~/utils/ip'

const route = useRoute()
const networkId = computed(() => String(route.params.id))

type NetworkDetail = Network & { allocations: IpAllocation[]; ranges: IpRange[] }
type AllocationSortKey = 'ipAddress' | 'label' | 'status' | 'networkName' | 'vlanId'
type SortDirection = 'asc' | 'desc'

const STATUS_SORT_ORDER: Record<IpAllocationStatus, number> = {
  gateway: 0,
  used: 1,
  reserved: 2,
  free: 3
}

const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const { data: network, refresh } = await useFetch<NetworkDetail>(() => `/api/networks/${networkId.value}`)

const sortState = ref<{ key: AllocationSortKey, direction: SortDirection }>({ key: 'ipAddress', direction: 'asc' })

const networkForm = reactive<Partial<Network>>({})
const isNetworkDrawerOpen = ref(false)
const derivedNetmask = computed(() => prefixToNetmask(networkForm.prefix))

watchEffect(() => {
  if (!network.value) return
  Object.assign(networkForm, network.value)
})

watch(derivedNetmask, (value) => {
  networkForm.netmask = value || ''
}, { immediate: true })

const allocationForm = reactive<Partial<IpAllocation>>({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'used', description: '', notes: '' })
const editingAllocationId = ref<string | null>(null)
const isAllocationDrawerOpen = ref(false)

const rangeForm = reactive<Partial<IpRange>>({ name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })
const editingRangeId = ref<string | null>(null)
const isRangeDrawerOpen = ref(false)
const rangeTypes: IpRangeType[] = ['dhcp', 'reserved', 'static', 'infrastructure', 'guest', 'management', 'service']

const networkFormDirty = computed(() => {
  if (!network.value) return false
  return JSON.stringify({ ...networkForm, netmask: derivedNetmask.value || '' }) !== JSON.stringify({ ...network.value, netmask: network.value.netmask || '' })
})

const allocationFormDirty = computed(() => Boolean(
  allocationForm.ipAddress
  || allocationForm.hostname
  || allocationForm.serviceName
  || allocationForm.deviceName
  || allocationForm.description
  || allocationForm.notes
  || allocationForm.status !== 'used'
))

const rangeFormDirty = computed(() => Boolean(
  rangeForm.name
  || rangeForm.startIp
  || rangeForm.endIp
  || rangeForm.description
  || rangeForm.notes
  || rangeForm.type !== 'dhcp'
))

const sortedAllocations = computed(() => {
  if (!network.value) return []

  const rows = network.value.allocations.map((item, index) => ({ item, index }))
  const { key, direction } = sortState.value
  const directionFactor = direction === 'asc' ? 1 : -1

  rows.sort((left, right) => {
    const comparison = compareAllocationRows(left.item, right.item, key)
    if (comparison !== 0) return comparison * directionFactor
    return left.index - right.index
  })

  return rows.map((row) => row.item)
})

const sortedRanges = computed(() => {
  if (!network.value) return []
  return [...network.value.ranges].sort((left, right) => {
    const startCompare = compareIpAddresses(left.startIp, right.startIp)
    if (startCompare !== 0) return startCompare
    return compareIpAddresses(left.endIp, right.endIp)
  })
})

const summary = computed(() => {
  if (!network.value) return { total: 0, used: 0, free: 0, reserved: 0, dhcp: 0, utilization: 0 }
  const used = network.value.allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reservedAllocations = network.value.allocations.filter((entry) => entry.status === 'reserved').length
  const dhcp = network.value.ranges.filter((entry) => entry.type === 'dhcp').reduce((sum, entry) => sum + ipRangeSize(entry.startIp, entry.endIp), 0)
  const reservedRanges = network.value.ranges.filter((entry) => entry.type === 'reserved').reduce((sum, entry) => sum + ipRangeSize(entry.startIp, entry.endIp), 0)
  const reserved = reservedAllocations + reservedRanges
  const occupied = used + reserved + dhcp
  const free = Math.max(0, network.value.maxHosts - occupied)
  const utilization = network.value.maxHosts > 0 ? Math.round((occupied / network.value.maxHosts) * 100) : 0
  return { total: network.value.maxHosts, used, free, reserved, dhcp, utilization }
})

function allocationLabel(allocation: IpAllocation) {
  return allocation.hostname || allocation.deviceName || allocation.serviceName || ''
}

function findRangeForIp(ipAddress: string): IpRange | null {
  if (!network.value) return null
  return network.value.ranges.find((range) => isIpWithinRange(ipAddress, range.startIp, range.endIp)) || null
}

function compareAllocationRows(left: IpAllocation, right: IpAllocation, key: AllocationSortKey): number {
  if (key === 'ipAddress') return compareIpAddresses(left.ipAddress, right.ipAddress)
  if (key === 'label') return textCollator.compare(allocationLabel(left), allocationLabel(right))
  if (key === 'status') return STATUS_SORT_ORDER[left.status] - STATUS_SORT_ORDER[right.status]
  if (key === 'networkName') return textCollator.compare(network.value?.name || '', network.value?.name || '')

  const leftVlan = network.value?.vlanId ?? Number.POSITIVE_INFINITY
  const rightVlan = network.value?.vlanId ?? Number.POSITIVE_INFINITY
  return leftVlan - rightVlan
}

function setSort(key: AllocationSortKey) {
  if (sortState.value.key === key) {
    sortState.value.direction = sortState.value.direction === 'asc' ? 'desc' : 'asc'
    return
  }
  sortState.value = { key, direction: 'asc' }
}

function sortIndicator(key: AllocationSortKey) {
  if (sortState.value.key !== key) return '↕'
  return sortState.value.direction === 'asc' ? '↑' : '↓'
}

function isSortedBy(key: AllocationSortKey) {
  return sortState.value.key === key
}

async function saveNetwork() {
  await $fetch(`/api/networks/${networkId.value}`, {
    method: 'PUT',
    body: {
      ...networkForm,
      vlanId: networkForm.vlanId ? Number(networkForm.vlanId) : undefined,
      prefix: Number(networkForm.prefix),
      netmask: derivedNetmask.value || undefined
    }
  })
  isNetworkDrawerOpen.value = false
  await refresh()
}

function beginEditAllocation(item: IpAllocation) {
  editingAllocationId.value = item.id
  Object.assign(allocationForm, item)
  isAllocationDrawerOpen.value = true
}

function beginCreateAllocation() {
  resetAllocationForm()
  isAllocationDrawerOpen.value = true
}

function resetAllocationForm() {
  editingAllocationId.value = null
  Object.assign(allocationForm, { ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'used', description: '', notes: '' })
}

async function saveAllocation() {
  if (editingAllocationId.value) {
    await $fetch(`/api/allocations/${editingAllocationId.value}`, { method: 'PUT', body: allocationForm })
  } else {
    await $fetch(`/api/networks/${networkId.value}/allocations`, { method: 'POST', body: allocationForm })
  }
  resetAllocationForm()
  isAllocationDrawerOpen.value = false
  await refresh()
}

async function removeAllocation(id: string) {
  await $fetch(`/api/allocations/${id}`, { method: 'DELETE' })
  await refresh()
}

function beginEditRange(item: IpRange) {
  editingRangeId.value = item.id
  Object.assign(rangeForm, item)
  isRangeDrawerOpen.value = true
}

function beginCreateRange() {
  resetRangeForm()
  isRangeDrawerOpen.value = true
}

function resetRangeForm() {
  editingRangeId.value = null
  Object.assign(rangeForm, { name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })
}

async function saveRange() {
  if (editingRangeId.value) {
    await $fetch(`/api/ranges/${editingRangeId.value}`, { method: 'PUT', body: rangeForm })
  } else {
    await $fetch(`/api/networks/${networkId.value}/ranges`, { method: 'POST', body: rangeForm })
  }

  resetRangeForm()
  isRangeDrawerOpen.value = false
  await refresh()
}

async function removeRange(id: string) {
  await $fetch(`/api/ranges/${id}`, { method: 'DELETE' })
  await refresh()
}


function closeNetworkDrawer() {
  isNetworkDrawerOpen.value = false
  if (network.value) Object.assign(networkForm, network.value)
}

function closeRangeDrawer() {
  isRangeDrawerOpen.value = false
  resetRangeForm()
}

function closeAllocationDrawer() {
  isAllocationDrawerOpen.value = false
  resetAllocationForm()
}

function badgeClass(status: string) {
  if (status === 'used') return 'badge--success'
  if (status === 'reserved') return 'badge--warning'
  if (status === 'gateway') return 'badge--danger'
  return 'badge--neutral'
}

function rangeBadgeClass(type: IpRangeType) {
  if (type === 'dhcp') return 'badge--info'
  if (type === 'infrastructure' || type === 'management') return 'badge--danger'
  if (type === 'reserved') return 'badge--warning'
  if (type === 'static') return 'badge--success'
  return 'badge--neutral'
}
</script>

<template>
  <div v-if="network" class="stack">
    <div class="row row-between">
      <h1>{{ network.name }}</h1>
      <div class="row">
        <button class="secondary" @click="isNetworkDrawerOpen = true">Edit network</button>
        <NuxtLink to="/networks"><button class="secondary">Back to networks</button></NuxtLink>
      </div>
    </div>


    <div class="panel network-sections-nav">
      <strong>Network</strong>
      <div class="row">
        <a href="#network-overview" class="section-pill">Overview</a>
        <a href="#network-ip-allocations" class="section-pill">IP allocations</a>
        <a href="#network-ip-ranges" class="section-pill">IP ranges</a>
      </div>
    </div>

    <div class="panel" id="network-overview">
      <h3 class="section-title">Network overview</h3>
      <div class="stats">
        <SwitchCard title="VLAN" :value="network.vlanId ?? '—'" />
        <SwitchCard title="Subnet" :value="`${network.subnet}/${network.prefix}`" />
        <SwitchCard title="Gateway" :value="network.gateway || '—'" />
        <SwitchCard title="Category" :value="network.category || '—'" />
      </div>
    </div>

    <div class="panel">
      <h3 class="section-title">IP utilization</h3>
      <div class="stats">
        <SwitchCard title="Total usable IPs" :value="summary.total" />
        <SwitchCard title="Used" :value="summary.used" />
        <SwitchCard title="Reserved" :value="summary.reserved" />
        <SwitchCard title="DHCP pool" :value="summary.dhcp" />
        <SwitchCard title="Free" :value="summary.free" />
      </div>
      <div class="util" style="margin-top: .8rem;">
        <div class="util-bar" :style="{ width: `${summary.utilization}%` }" />
      </div>
      <small>{{ summary.utilization }}% utilization</small>
    </div>

    <div class="panel table-wrap" id="network-ip-ranges">
      <div class="row row-between" style="padding: .75rem;">
        <h3>IP ranges</h3>
        <button @click="beginCreateRange">Add range</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Start IP</th>
            <th>End IP</th>
            <th>Size</th>
            <th>Description</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedRanges" :key="item.id">
            <td>{{ item.name }}</td>
            <td><span class="badge" :class="rangeBadgeClass(item.type)">{{ item.type }}</span></td>
            <td>{{ item.startIp }}</td>
            <td>{{ item.endIp }}</td>
            <td>{{ ipRangeSize(item.startIp, item.endIp) }}</td>
            <td>{{ item.description || '—' }}</td>
            <td>{{ item.notes || '—' }}</td>
            <td class="row">
              <button class="secondary" @click="beginEditRange(item)">Edit</button>
              <button class="danger" @click="removeRange(item.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel table-wrap" id="network-ip-allocations">
      <div class="row row-between" style="padding: .75rem;">
        <h3>IP allocations</h3>
        <button @click="beginCreateAllocation">Add allocation</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>
              <button class="table-sort" :class="{ 'table-sort--active': isSortedBy('ipAddress') }" @click="setSort('ipAddress')">
                IP address <span>{{ sortIndicator('ipAddress') }}</span>
              </button>
            </th>
            <th>
              <button class="table-sort" :class="{ 'table-sort--active': isSortedBy('label') }" @click="setSort('label')">
                Hostname / Device / Service <span>{{ sortIndicator('label') }}</span>
              </button>
            </th>
            <th>Range</th>
            <th>
              <button class="table-sort" :class="{ 'table-sort--active': isSortedBy('status') }" @click="setSort('status')">
                Status <span>{{ sortIndicator('status') }}</span>
              </button>
            </th>
            <th>
              <button class="table-sort" :class="{ 'table-sort--active': isSortedBy('networkName') }" @click="setSort('networkName')">
                Network name <span>{{ sortIndicator('networkName') }}</span>
              </button>
            </th>
            <th>
              <button class="table-sort" :class="{ 'table-sort--active': isSortedBy('vlanId') }" @click="setSort('vlanId')">
                VLAN ID <span>{{ sortIndicator('vlanId') }}</span>
              </button>
            </th>
            <th>Description</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedAllocations" :key="item.id" :class="{ 'gateway-row': item.status === 'gateway' }">
            <td>{{ item.ipAddress }}</td>
            <td>{{ item.hostname || item.deviceName || item.serviceName || '—' }}</td>
            <td>
              <template v-if="findRangeForIp(item.ipAddress)">
                <span class="badge" :class="rangeBadgeClass(findRangeForIp(item.ipAddress)!.type)">{{ findRangeForIp(item.ipAddress)!.name }} ({{ findRangeForIp(item.ipAddress)!.type }})</span>
              </template>
              <template v-else>—</template>
            </td>
            <td><span class="badge" :class="badgeClass(item.status)">{{ item.status }}</span></td>
            <td>{{ network.name }}</td>
            <td>{{ network.vlanId ?? '—' }}</td>
            <td>{{ item.description || '—' }}</td>
            <td>{{ item.notes || '—' }}</td>
            <td class="row">
              <button class="secondary" @click="beginEditAllocation(item)">Edit</button>
              <button class="danger" @click="removeAllocation(item.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormDrawer
      :open="isNetworkDrawerOpen"
      title="Edit network"
      description="Update network settings and metadata."
      :has-unsaved-changes="networkFormDirty"
      @close="closeNetworkDrawer"
    >
      <form class="stack" @submit.prevent="saveNetwork">
        <div class="network-form-grid">
          <label class="network-field"><span class="network-field__label">VLAN ID</span><input v-model="networkForm.vlanId" type="number" min="1" max="4094"></label>
          <label class="network-field"><span class="network-field__label">Network name</span><input v-model="networkForm.name"></label>
          <label class="network-field"><span class="network-field__label">Subnet</span><input v-model="networkForm.subnet"></label>
          <label class="network-field"><span class="network-field__label">Prefix</span><input v-model="networkForm.prefix" type="number" min="0" max="32"></label>
          <label class="network-field"><span class="network-field__label">Netmask</span><input :value="derivedNetmask || 'Invalid prefix'" readonly disabled></label>
          <label class="network-field"><span class="network-field__label">Gateway</span><input v-model="networkForm.gateway"></label>
          <label class="network-field"><span class="network-field__label">Category</span><input v-model="networkForm.category"></label>
          <label class="network-field"><span class="network-field__label">Routing</span><input v-model="networkForm.routing"></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Description</span><input v-model="networkForm.description"></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Notes</span><input v-model="networkForm.notes"></label>
        </div>
        <div class="row row-end">
          <button type="button" class="secondary" @click="closeNetworkDrawer">Cancel</button>
          <button type="submit">Save network</button>
        </div>
      </form>
    </FormDrawer>

    <FormDrawer
      :open="isRangeDrawerOpen"
      :title="editingRangeId ? 'Edit IP range' : 'Add IP range'"
      description="Manage DHCP, reserved, and service ranges."
      :has-unsaved-changes="rangeFormDirty"
      width="md"
      @close="closeRangeDrawer"
    >
      <form class="stack" @submit.prevent="saveRange">
        <div class="network-form-grid">
          <label class="network-field"><span class="network-field__label">Range name</span><input v-model="rangeForm.name" required></label>
          <label class="network-field"><span class="network-field__label">Type</span><select v-model="rangeForm.type"><option v-for="item in rangeTypes" :key="item" :value="item">{{ item }}</option></select></label>
          <label class="network-field"><span class="network-field__label">Start IP</span><input v-model="rangeForm.startIp" required></label>
          <label class="network-field"><span class="network-field__label">End IP</span><input v-model="rangeForm.endIp" required></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Description</span><input v-model="rangeForm.description"></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Notes</span><input v-model="rangeForm.notes"></label>
        </div>
        <div class="row row-end">
          <button type="button" class="secondary" @click="closeRangeDrawer">Cancel</button>
          <button type="submit">{{ editingRangeId ? 'Update range' : 'Add range' }}</button>
        </div>
      </form>
    </FormDrawer>

    <FormDrawer
      :open="isAllocationDrawerOpen"
      :title="editingAllocationId ? 'Edit IP allocation' : 'Add IP allocation'"
      description="Assign addresses to devices and services."
      :has-unsaved-changes="allocationFormDirty"
      width="md"
      @close="closeAllocationDrawer"
    >
      <form class="stack" @submit.prevent="saveAllocation">
        <div class="network-form-grid">
          <label class="network-field"><span class="network-field__label">IP address</span><input v-model="allocationForm.ipAddress" required></label>
          <label class="network-field"><span class="network-field__label">Hostname</span><input v-model="allocationForm.hostname"></label>
          <label class="network-field"><span class="network-field__label">Service name</span><input v-model="allocationForm.serviceName"></label>
          <label class="network-field"><span class="network-field__label">Device name</span><input v-model="allocationForm.deviceName"></label>
          <label class="network-field"><span class="network-field__label">Status</span><select v-model="allocationForm.status"><option value="used">used</option><option value="reserved">reserved</option><option value="free">free</option><option value="gateway">gateway</option></select></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Description</span><input v-model="allocationForm.description"></label>
          <label class="network-field network-form-grid__full"><span class="network-field__label">Notes</span><input v-model="allocationForm.notes"></label>
        </div>
        <div class="row row-end">
          <button type="button" class="secondary" @click="closeAllocationDrawer">Cancel</button>
          <button type="submit">{{ editingAllocationId ? 'Update allocation' : 'Add allocation' }}</button>
        </div>
      </form>
    </FormDrawer>
  </div>
</template>
