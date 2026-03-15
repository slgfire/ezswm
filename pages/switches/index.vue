<template>
  <div class="space-y-4 p-4 md:p-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Switches</h2>
    </div>
    <UCard>
      <UTable :rows="switches" :columns="columns">
        <template #name-data="{ row }">
          <NuxtLink :to="`/switches/${row.id}`" class="text-primary hover:underline">{{ row.name }}</NuxtLink>
        </template>
      </UTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const { data: switches } = await useFetch('/api/switches', { default: () => [] })
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'model', label: 'Model' },
  { key: 'managementIp', label: 'Management IP' },
  { key: 'status', label: 'Status' }
]
</script>
