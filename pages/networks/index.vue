<script setup lang="ts">
import type { IpAllocation, Network } from '~/types/models'
import { prefixToNetmask } from '~/utils/ip'

type NetworkWithAllocations = Network & { allocations: IpAllocation[] }

const query = reactive({ vlan: '', name: '', subnet: '', hostname: '', ip: '' })
const panelOpen = ref(false)
const editingNetworkId = ref<string | null>(null)
const saveError = ref('')
const saving = ref(false)

const form = reactive<Partial<Network>>({ name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined, category: '' })
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

function resetForm() {
  editingNetworkId.value = null
  saveError.value = ''
  Object.assign(form, { name: '', subnet: '', prefix: 24, gateway: '', routing: '', description: '', notes: '', vlanId: undefined, category: '' })
}

function closePanel() {
  panelOpen.value = false
  resetForm()
}

watch(panelOpen, (isOpen) => {
  if (!isOpen) resetForm()
})

function beginCreate() {
  resetForm()
  panelOpen.value = true
}

function beginEdit(network: NetworkWithAllocations) {
  editingNetworkId.value = network.id
  saveError.value = ''
  Object.assign(form, {
    name: network.name,
    subnet: network.subnet,
    prefix: network.prefix,
    gateway: network.gateway || '',
    routing: network.routing || '',
    description: network.description || '',
    notes: network.notes || '',
    vlanId: network.vlanId,
    category: network.category || ''
  })
  panelOpen.value = true
}

function usage(network: NetworkWithAllocations) {
  const used = network.allocations.filter((entry) => entry.status === 'used' || entry.status === 'gateway').length
  const reserved = network.allocations.filter((entry) => entry.status === 'reserved').length
  const free = Math.max(0, network.maxHosts - used - reserved)
  const utilization = network.maxHosts > 0 ? Math.round(((used + reserved) / network.maxHosts) * 100) : 0
  return { used, reserved, free, utilization }
}

async function saveNetwork() {
  saveError.value = ''
  saving.value = true
  try {
    const payload = {
      ...form,
      vlanId: form.vlanId ? Number(form.vlanId) : undefined,
      prefix: Number(form.prefix),
      netmask: derivedNetmask.value || undefined
    }

    if (editingNetworkId.value) {
      await $fetch(`/api/networks/${editingNetworkId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/networks', { method: 'POST', body: payload })
    }

    await refresh()
    closePanel()
  } catch (error: any) {
    saveError.value = error?.data?.statusMessage || error?.message || 'Failed to save network.'
  } finally {
    saving.value = false
  }
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
      <UButton icon="i-lucide-plus" label="Add network" @click="beginCreate" />
    </div>

    <UCard>
      <div class="row">
        <UInput v-model="query.vlan" placeholder="Filter by VLAN ID" />
        <UInput v-model="query.name" placeholder="Filter by network name" />
        <UInput v-model="query.subnet" placeholder="Filter by subnet" />
        <UInput v-model="query.hostname" placeholder="Filter by hostname" />
        <UInput v-model="query.ip" placeholder="Filter by IP address" />
      </div>
    </UCard>

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
              <NuxtLink :to="`/networks/${network.id}`"><UButton color="neutral" variant="soft" label="Open" /></NuxtLink>
              <UButton color="neutral" variant="soft" label="Edit network" @click="beginEdit(network)" />
              <UButton color="error" variant="soft" label="Delete" @click="removeNetwork(network.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <USlideover v-model:open="panelOpen" :ui="{ content: 'max-w-4xl' }">
      <UCard class="h-full rounded-none border-0">
        <template #header>
          <div class="row row-between">
            <div>
              <h2 class="text-lg font-semibold">{{ editingNetworkId ? 'Edit network' : 'Add network' }}</h2>
              <p class="text-sm text-muted">Create or update network settings without leaving the overview.</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-lucide-x" @click="closePanel" />
          </div>
        </template>

        <UAlert v-if="saveError" color="error" variant="soft" :title="saveError" />

        <UForm :state="form" class="stack" @submit.prevent="saveNetwork">
          <div class="network-form-grid">
            <UInput v-model="form.vlanId" type="number" min="1" max="4094" placeholder="Optional VLAN ID" />
            <UInput v-model="form.name" placeholder="e.g. Production LAN" required />
            <UInput v-model="form.subnet" placeholder="e.g. 10.10.10.0" required />
            <UInput v-model="form.prefix" type="number" min="0" max="32" placeholder="e.g. 24" required />
            <UInput :model-value="derivedNetmask || 'Invalid prefix'" disabled />
            <UInput v-model="form.gateway" placeholder="e.g. 10.10.10.1" />
            <UInput v-model="form.category" placeholder="e.g. management" />
            <UInput v-model="form.routing" placeholder="Routing information" />
            <UInput v-model="form.description" placeholder="Short description" class="network-form-grid__full" />
            <UInput v-model="form.notes" placeholder="Optional notes" class="network-form-grid__full" />
          </div>
          <div class="row row-end">
            <UButton type="button" color="neutral" variant="soft" label="Cancel" @click="closePanel" />
            <UButton type="submit" :loading="saving" :label="editingNetworkId ? 'Save network' : 'Create network'" />
          </div>
        </UForm>
      </UCard>
    </USlideover>
  </div>
</template>
