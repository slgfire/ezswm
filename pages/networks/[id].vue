<script setup lang="ts">
import type { IpAllocation, IpRange, Network } from '~/types/models'

const { t } = useI18n()
const route = useRoute()

const activeTab = ref('overview')
const allocOpen = ref(false)
const rangeOpen = ref(false)
const editingAlloc = ref<IpAllocation | null>(null)
const editingRange = ref<IpRange | null>(null)

const allocForm = ref({ ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'assigned', description: '', notes: '' })
const rangeForm = ref({ name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' })

const { data: network } = await useFetch<Network>(`/api/networks/${route.params.id}`)
const { data: allocations, refresh: refreshAlloc } = await useFetch<IpAllocation[]>(`/api/networks/${route.params.id}/allocations`)
const { data: ranges, refresh: refreshRanges } = await useFetch<IpRange[]>(`/api/networks/${route.params.id}/ranges`)

function openAllocation(item?: IpAllocation) {
  editingAlloc.value = item || null
  allocForm.value = item ? { ...item } : { ipAddress: '', hostname: '', serviceName: '', deviceName: '', status: 'assigned', description: '', notes: '' }
  allocOpen.value = true
}

function openRange(item?: IpRange) {
  editingRange.value = item || null
  rangeForm.value = item ? { ...item } : { name: '', type: 'dhcp', startIp: '', endIp: '', description: '', notes: '' }
  rangeOpen.value = true
}

async function saveAllocation() {
  if (editingAlloc.value) {
    await $fetch(`/api/ip-allocations/${editingAlloc.value.id}`, { method: 'PUT', body: allocForm.value })
  } else {
    await $fetch(`/api/networks/${route.params.id}/allocations`, { method: 'POST', body: allocForm.value })
  }
  allocOpen.value = false
  await refreshAlloc()
}

async function saveRange() {
  if (editingRange.value) {
    await $fetch(`/api/ip-ranges/${editingRange.value.id}`, { method: 'PUT', body: rangeForm.value })
  } else {
    await $fetch(`/api/networks/${route.params.id}/ranges`, { method: 'POST', body: rangeForm.value })
  }
  rangeOpen.value = false
  await refreshRanges()
}

async function removeAllocation(id: string) {
  await $fetch(`/api/ip-allocations/${id}`, { method: 'DELETE' })
  await refreshAlloc()
}

async function removeRange(id: string) {
  await $fetch(`/api/ip-ranges/${id}`, { method: 'DELETE' })
  await refreshRanges()
}
</script>

<template>
  <div v-if="network" class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">{{ network.name }} (VLAN {{ network.vlanId }})</h1>
      <p class="text-muted">{{ network.subnet }}/{{ network.prefix }} · {{ network.netmask }}</p>
    </div>

    <UTabs v-model="activeTab" :items="[
      { label: t('network.overview'), value: 'overview' },
      { label: t('network.ipAllocations'), value: 'allocations' },
      { label: t('network.ipRanges'), value: 'ranges' }
    ]" />

    <UCard v-if="activeTab === 'overview'">
      <p><strong>{{ t('network.gateway') }}:</strong> {{ network.gateway }}</p>
      <p><strong>{{ t('network.routing') }}:</strong> {{ network.routing }}</p>
      <p><strong>{{ t('network.category') }}:</strong> {{ network.category }}</p>
      <p><strong>{{ t('common.description') }}:</strong> {{ network.description }}</p>
    </UCard>

    <UCard v-else-if="activeTab === 'allocations'">
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="font-semibold">{{ t('network.ipAllocations') }}</h2>
          <UButton size="sm" icon="i-lucide-plus" @click="openAllocation()">{{ t('common.create') }}</UButton>
        </div>
      </template>
      <UTable :data="allocations || []" :columns="[
        { accessorKey: 'ipAddress', header: t('ipam.ipAddress') },
        { accessorKey: 'hostname', header: t('ipam.hostname') },
        { accessorKey: 'status', header: t('common.status') }
      ]">
        <template #expanded="{ row }">
          <div class="flex gap-2 p-2">
            <UButton size="sm" color="neutral" variant="soft" @click="openAllocation(row.original)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="error" variant="soft" @click="removeAllocation(row.original.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <UCard v-else>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="font-semibold">{{ t('network.ipRanges') }}</h2>
          <UButton size="sm" icon="i-lucide-plus" @click="openRange()">{{ t('common.create') }}</UButton>
        </div>
      </template>
      <UTable :data="ranges || []" :columns="[
        { accessorKey: 'name', header: t('common.name') },
        { accessorKey: 'type', header: t('common.type') },
        { accessorKey: 'startIp', header: t('ipam.startIp') },
        { accessorKey: 'endIp', header: t('ipam.endIp') }
      ]">
        <template #expanded="{ row }">
          <div class="flex gap-2 p-2">
            <UButton size="sm" color="neutral" variant="soft" @click="openRange(row.original)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="error" variant="soft" @click="removeRange(row.original.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <USlideover v-model:open="allocOpen" :title="editingAlloc ? t('ipam.editAllocation') : t('ipam.createAllocation')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="allocForm.ipAddress" :label="t('ipam.ipAddress')" />
          <UInput v-model="allocForm.hostname" :label="t('ipam.hostname')" />
          <UInput v-model="allocForm.serviceName" :label="t('ipam.serviceName')" />
          <UInput v-model="allocForm.deviceName" :label="t('ipam.deviceName')" />
          <USelect v-model="allocForm.status" :items="['assigned','reserved','available']" :label="t('common.status')" />
          <UTextarea v-model="allocForm.description" :label="t('common.description')" />
          <UButton block @click="saveAllocation">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>

    <USlideover v-model:open="rangeOpen" :title="editingRange ? t('ipam.editRange') : t('ipam.createRange')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="rangeForm.name" :label="t('common.name')" />
          <USelect v-model="rangeForm.type" :items="['dhcp','reserved','static','infrastructure']" :label="t('common.type')" />
          <UInput v-model="rangeForm.startIp" :label="t('ipam.startIp')" />
          <UInput v-model="rangeForm.endIp" :label="t('ipam.endIp')" />
          <UTextarea v-model="rangeForm.description" :label="t('common.description')" />
          <UButton block @click="saveRange">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
