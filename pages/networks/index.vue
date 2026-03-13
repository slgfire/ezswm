<script setup lang="ts">
import type { IpAllocation, Network } from '~/types/models'

type NetworkWithAllocations = Network & { allocations: IpAllocation[] }

const query = reactive({ vlan: '', name: '', subnet: '', hostname: '', ip: '' })
const form = reactive<Partial<Network>>({ name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined })
const { data: networks, refresh } = await useFetch<NetworkWithAllocations[]>('/api/networks')

const filtered = computed(() => (networks.value || []).filter((network) => {
  const vlanMatch = !query.vlan || `${network.vlanId || ''}`.includes(query.vlan)
  const nameMatch = !query.name || network.name.toLowerCase().includes(query.name.toLowerCase())
  const subnetMatch = !query.subnet || `${network.subnet}/${network.prefix}`.toLowerCase().includes(query.subnet.toLowerCase())
  const hostMatch = !query.hostname || network.allocations.some((entry) => `${entry.hostname || ''} ${entry.deviceName || ''} ${entry.serviceName || ''}`.toLowerCase().includes(query.hostname.toLowerCase()))
  const ipMatch = !query.ip || network.allocations.some((entry) => entry.ipAddress.includes(query.ip))
  return vlanMatch && nameMatch && subnetMatch && hostMatch && ipMatch
}))

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
      prefix: Number(form.prefix)
    }
  })
  Object.assign(form, { name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined })
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
    </div>

    <div class="panel row">
      <input v-model="query.vlan" placeholder="Filter by VLAN ID">
      <input v-model="query.name" placeholder="Filter by network name">
      <input v-model="query.subnet" placeholder="Filter by subnet">
      <input v-model="query.hostname" placeholder="Filter by hostname">
      <input v-model="query.ip" placeholder="Filter by IP address">
    </div>

    <div class="panel">
      <h3 class="section-title">Create network</h3>
      <div class="row">
        <input v-model="form.vlanId" placeholder="VLAN ID (optional)">
        <input v-model="form.name" placeholder="Network name">
        <input v-model="form.subnet" placeholder="Subnet (e.g. 10.10.10.0)">
        <input v-model="form.prefix" type="number" min="0" max="32" placeholder="Prefix">
        <input v-model="form.gateway" placeholder="Gateway">
        <input v-model="form.routing" placeholder="Routing">
      </div>
      <div class="row" style="margin-top: .6rem;">
        <input v-model="form.description" placeholder="Description">
        <input v-model="form.notes" placeholder="Notes">
        <button @click="createNetwork">Create network</button>
      </div>
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
  </div>
</template>
