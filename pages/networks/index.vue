<template>
  <div class="space-y-4 p-4 md:p-6">
    <h2 class="text-2xl font-semibold">Networks</h2>
    <UCard>
      <UTable :rows="networks" :columns="columns">
        <template #name-data="{ row }">
          <NuxtLink :to="`/networks/${row.id}`" class="text-primary hover:underline">{{ row.name }}</NuxtLink>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { data: networks } = await useFetch('/api/networks', { default: () => [] })
const columns = [
  { key: 'vlanId', label: 'VLAN' },
  { key: 'name', label: 'Name' },
  { key: 'subnet', label: 'Subnet' },
  { key: 'prefix', label: 'Prefix' },
  { key: 'gateway', label: 'Gateway' }
]
</script>
