<script setup lang="ts">
import type { IpAllocation, Network } from '~/types/models'

const route = useRoute()
const networkId = computed(() => String(route.params.id))

type NetworkDetail = Network & { allocations: IpAllocation[] }

const { data: network, refresh } = await useFetch<NetworkDetail>(() => `/api/networks/${networkId.value}`)

const networkForm = reactive<Partial<Network>>({})
watchEffect(() => {
  if (!network.value) return
  Object.assign(networkForm, network.value)
})

const allocationForm = reactive<Partial<IpAllocation>>({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'used', description: '', notes: '' })
const editingAllocationId = ref<string | null>(null)

const summary = computed(() => {
  if (!network.value) return { total: 0, used: 0, free: 0, reserved: 0, utilization: 0 }
  const used = network.value.allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reserved = network.value.allocations.filter((entry) => entry.status === 'reserved').length
  const free = Math.max(0, network.value.maxHosts - used - reserved)
  const utilization = network.value.maxHosts > 0 ? Math.round(((used + reserved) / network.value.maxHosts) * 100) : 0
  return { total: network.value.maxHosts, used, free, reserved, utilization }
})

async function saveNetwork() {
  await $fetch(`/api/networks/${networkId.value}`, {
    method: 'PUT',
    body: {
      ...networkForm,
      vlanId: networkForm.vlanId ? Number(networkForm.vlanId) : undefined,
      prefix: Number(networkForm.prefix)
    }
  })
  await refresh()
}

function beginEditAllocation(item: IpAllocation) {
  editingAllocationId.value = item.id
  Object.assign(allocationForm, item)
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
  await refresh()
}

async function removeAllocation(id: string) {
  await $fetch(`/api/allocations/${id}`, { method: 'DELETE' })
  await refresh()
}

function badgeClass(status: string) {
  if (status === 'used') return 'badge--success'
  if (status === 'reserved') return 'badge--warning'
  if (status === 'gateway') return 'badge--danger'
  return 'badge--neutral'
}
</script>

<template>
  <div v-if="network" class="stack">
    <div class="row row-between">
      <h1>{{ network.name }}</h1>
      <NuxtLink to="/networks"><button class="secondary">Back to networks</button></NuxtLink>
    </div>

    <div class="panel">
      <h3 class="section-title">Network details</h3>
      <div class="row">
        <input v-model="networkForm.vlanId" placeholder="VLAN ID">
        <input v-model="networkForm.name" placeholder="Name">
        <input v-model="networkForm.subnet" placeholder="Subnet">
        <input v-model="networkForm.prefix" type="number" min="0" max="32" placeholder="Prefix">
        <input v-model="networkForm.netmask" placeholder="Netmask">
        <input v-model="networkForm.gateway" placeholder="Gateway">
        <input v-model="networkForm.routing" placeholder="Routing">
      </div>
      <div class="row" style="margin-top: .6rem;">
        <input v-model="networkForm.description" placeholder="Description">
        <input v-model="networkForm.notes" placeholder="Notes">
        <button @click="saveNetwork">Save network</button>
      </div>
    </div>

    <div class="panel">
      <h3 class="section-title">IP utilization</h3>
      <div class="stats">
        <SwitchCard title="Total usable IPs" :value="summary.total" />
        <SwitchCard title="Used" :value="summary.used" />
        <SwitchCard title="Reserved" :value="summary.reserved" />
        <SwitchCard title="Free" :value="summary.free" />
      </div>
      <div class="util" style="margin-top: .8rem;">
        <div class="util-bar" :style="{ width: `${summary.utilization}%` }" />
      </div>
      <small>{{ summary.utilization }}% utilization</small>
    </div>

    <div class="panel">
      <h3 class="section-title">Allocation editor</h3>
      <div class="row">
        <input v-model="allocationForm.ipAddress" placeholder="IP address">
        <input v-model="allocationForm.hostname" placeholder="Hostname">
        <input v-model="allocationForm.serviceName" placeholder="Service name">
        <input v-model="allocationForm.deviceName" placeholder="Device name">
        <select v-model="allocationForm.status">
          <option value="used">used</option>
          <option value="reserved">reserved</option>
          <option value="free">free</option>
          <option value="gateway">gateway</option>
        </select>
      </div>
      <div class="row" style="margin-top: .6rem;">
        <input v-model="allocationForm.description" placeholder="Description">
        <input v-model="allocationForm.notes" placeholder="Notes">
        <button @click="saveAllocation">{{ editingAllocationId ? 'Update allocation' : 'Add allocation' }}</button>
        <button v-if="editingAllocationId" class="secondary" @click="resetAllocationForm">Cancel</button>
      </div>
    </div>

    <div class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>IP address</th>
            <th>Hostname / Device / Service</th>
            <th>Status</th>
            <th>Description</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in network.allocations" :key="item.id" :class="{ 'gateway-row': item.status === 'gateway' }">
            <td>{{ item.ipAddress }}</td>
            <td>{{ item.hostname || item.deviceName || item.serviceName || '—' }}</td>
            <td><span class="badge" :class="badgeClass(item.status)">{{ item.status }}</span></td>
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
  </div>
</template>
