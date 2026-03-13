<script setup lang="ts">
import type { IpAllocation, Network } from '~/types/models'
import { prefixToNetmask } from '~/utils/ip'

type NetworkWithAllocations = Network & { allocations: IpAllocation[] }

const query = reactive({ vlan: '', name: '', subnet: '', hostname: '', ip: '' })
const form = reactive<Partial<Network>>({ name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined, category: '' })
const isAddDrawerOpen = ref(false)
const derivedNetmask = computed(() => prefixToNetmask(form.prefix))
const { data: networks, refresh } = await useFetch<NetworkWithAllocations[]>('/api/networks')

const filtered = computed(() => (networks.value || []).filter((network) => {
  const vlanMatch = !query.vlan || `${network.vlanId || ''}`.includes(query.vlan)
  const nameMatch = !query.name || network.name.toLowerCase().includes(query.name.toLowerCase())
  const subnetMatch = !query.subnet || `${network.subnet}/${network.prefix}`.toLowerCase().includes(query.subnet.toLowerCase())
  const hostMatch = !query.hostname || network.allocations.some((entry) => `${entry.hostname || ''} ${entry.deviceName || ''} ${entry.serviceName || ''}`.toLowerCase().includes(query.hostname.toLowerCase()))
  const ipMatch = !query.ip || network.allocations.some((entry) => entry.ipAddress.includes(query.ip))
  return vlanMatch && nameMatch && subnetMatch && hostMatch && ipMatch
}))

const isNetworkFormDirty = computed(() => {
  return Boolean(
    form.name
    || form.subnet
    || form.gateway
    || form.routing
    || form.description
    || form.notes
    || form.category
    || form.vlanId
    || form.prefix !== 24
  )
})

function resetForm() {
  Object.assign(form, { name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined, category: '' })
}

function usage(network: NetworkWithAllocations) {
  const used = network.allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reserved = network.allocations.filter((entry) => entry.status === 'reserved').length
  const free = Math.max(0, network.maxHosts - used - reserved)
  const utilization = network.maxHosts > 0 ? Math.round(((used + reserved) / network.maxHosts) * 100) : 0
  return { used, reserved, free, utilization }
}

async function createNetwork() {
  await $fetch('/api/networks', {
    method: 'POST',
    body: {
      ...form,
      vlanId: form.vlanId ? Number(form.vlanId) : undefined,
      prefix: Number(form.prefix),
      netmask: derivedNetmask.value || undefined
    }
  })
  resetForm()
  isAddDrawerOpen.value = false
  await refresh()
}

async function removeNetwork(id: string) {
  await $fetch(`/api/networks/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="stack">
    <div class="row row-between">
      <h1>Networks</h1>
      <button @click="isAddDrawerOpen = true">Add network</button>
    </div>

    <div class="panel row">
      <input v-model="query.vlan" placeholder="Filter by VLAN ID">
      <input v-model="query.name" placeholder="Filter by network name">
      <input v-model="query.subnet" placeholder="Filter by subnet">
      <input v-model="query.hostname" placeholder="Filter by hostname">
      <input v-model="query.ip" placeholder="Filter by IP address">
    </div>

    <div class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>VLAN</th>
            <th>Name</th>
            <th>Subnet</th>
            <th>Gateway</th>
            <th>Used / Reserved / Free</th>
            <th>Utilization</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="network in filtered" :key="network.id">
            <td>{{ network.vlanId ?? '—' }}</td>
            <td><NuxtLink :to="`/networks/${network.id}`">{{ network.name }}</NuxtLink></td>
            <td>{{ network.subnet }}/{{ network.prefix }}</td>
            <td>{{ network.gateway || '—' }}</td>
            <td>
              <span>{{ usage(network).used }} / {{ usage(network).reserved }} / {{ usage(network).free }}</span>
            </td>
            <td>
              <div class="util">
                <div class="util-bar" :style="{ width: `${usage(network).utilization}%` }" />
              </div>
              <small>{{ usage(network).utilization }}%</small>
            </td>
            <td class="row">
              <NuxtLink :to="`/networks/${network.id}`"><button class="secondary">Open</button></NuxtLink>
              <button class="danger" @click="removeNetwork(network.id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormDrawer
      :open="isAddDrawerOpen"
      title="Add network"
      description="Create a network without leaving the overview."
      :has-unsaved-changes="isNetworkFormDirty"
      @close="isAddDrawerOpen = false"
    >
      <form class="stack" @submit.prevent="createNetwork">
        <div class="network-form-grid">
          <label class="network-field">
            <span class="network-field__label">VLAN ID</span>
            <input v-model="form.vlanId" type="number" min="1" max="4094" placeholder="Optional VLAN ID">
            <small class="network-field__hint">Optional VLAN identifier for this network</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Network name</span>
            <input v-model="form.name" placeholder="e.g. Production LAN">
          </label>
          <label class="network-field">
            <span class="network-field__label">Subnet</span>
            <input v-model="form.subnet" placeholder="e.g. 10.10.10.0">
            <small class="network-field__hint">Base network address</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Prefix</span>
            <input v-model="form.prefix" type="number" min="0" max="32" placeholder="e.g. 24">
            <small class="network-field__hint">CIDR prefix length, e.g. 24</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Netmask</span>
            <input :value="derivedNetmask || 'Invalid prefix'" readonly disabled>
            <small class="network-field__hint">Automatically derived from prefix</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Gateway</span>
            <input v-model="form.gateway" placeholder="e.g. 10.10.10.1">
            <small class="network-field__hint">Default gateway address within this subnet</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Category</span>
            <input v-model="form.category" placeholder="e.g. management">
            <small class="network-field__hint">Logical usage such as service, management, user, or storage</small>
          </label>
          <label class="network-field">
            <span class="network-field__label">Routing</span>
            <input v-model="form.routing" placeholder="Routing information">
          </label>
          <label class="network-field network-form-grid__full">
            <span class="network-field__label">Description</span>
            <input v-model="form.description" placeholder="Short description">
            <small class="network-field__hint">Short purpose of this network</small>
          </label>
          <label class="network-field network-form-grid__full">
            <span class="network-field__label">Notes</span>
            <input v-model="form.notes" placeholder="Optional notes">
            <small class="network-field__hint">Optional internal notes</small>
          </label>
        </div>
        <div class="row row-end">
          <button type="button" class="secondary" @click="resetForm(); isAddDrawerOpen = false">Cancel</button>
          <button type="submit">Create network</button>
        </div>
      </form>
    </FormDrawer>
  </div>
</template>
