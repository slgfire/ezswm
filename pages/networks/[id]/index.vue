<template>
  <div class="space-y-4 p-4 md:p-6">
    <UCard v-if="network">
      <template #header>
        <h2 class="text-xl font-semibold">{{ network.name }} (VLAN {{ network.vlanId }})</h2>
      </template>
      <p class="text-gray-300">{{ network.subnet }}/{{ network.prefix }} ({{ network.netmask }})</p>
    </UCard>

    <UTabs :items="tabs" v-model="activeTab" />

    <UCard v-if="activeTab === 'overview'">
      <p>{{ network?.description || 'No description' }}</p>
    </UCard>

    <UCard v-if="activeTab === 'allocations'">
      <UTable :rows="networkAllocations" :columns="allocationCols" />
    </UCard>

    <UCard v-if="activeTab === 'ranges'">
      <UTable :rows="networkRanges" :columns="rangeCols" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: network } = await useFetch(`/api/networks/${route.params.id}`)
const { data: allocations } = await useFetch('/api/allocations', { default: () => [] })
const { data: ranges } = await useFetch('/api/ranges', { default: () => [] })
const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'allocations', label: 'IP allocations' },
  { key: 'ranges', label: 'IP ranges' }
]
const activeTab = ref((route.query.tab as string) || 'overview')
const networkAllocations = computed(() => allocations.value.filter((item: any) => item.networkId === route.params.id))
const networkRanges = computed(() => ranges.value.filter((item: any) => item.networkId === route.params.id))
const allocationCols = [{ key: 'ipAddress', label: 'IP' }, { key: 'hostname', label: 'Hostname' }, { key: 'status', label: 'Status' }]
const rangeCols = [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'startIp', label: 'Start' }, { key: 'endIp', label: 'End' }]
</script>
