<template>
  <div class="p-4 md:p-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <template #header>Total Switches</template>
        <p class="text-3xl font-semibold">{{ switches.length }}</p>
      </UCard>
      <UCard>
        <template #header>Total Networks</template>
        <p class="text-3xl font-semibold">{{ networks.length }}</p>
      </UCard>
      <UCard>
        <template #header>IP Allocations</template>
        <p class="text-3xl font-semibold">{{ allocations.length }}</p>
      </UCard>
      <UCard>
        <template #header>IP Ranges</template>
        <p class="text-3xl font-semibold">{{ ranges.length }}</p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const [{ data: switches }, { data: networks }, { data: allocations }, { data: ranges }] = await Promise.all([
  useFetch('/api/switches', { default: () => [] }),
  useFetch('/api/networks', { default: () => [] }),
  useFetch('/api/allocations', { default: () => [] }),
  useFetch('/api/ranges', { default: () => [] })
])
</script>
