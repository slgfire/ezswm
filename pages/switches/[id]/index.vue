<template>
  <div class="space-y-4 p-4 md:p-6">
    <UCard v-if="switchItem">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">{{ switchItem.name }}</h2>
          <UBadge>{{ switchItem.status }}</UBadge>
        </div>
      </template>
      <div class="grid gap-3 md:grid-cols-2">
        <div><span class="text-gray-400">Model:</span> {{ switchItem.vendor }} {{ switchItem.model }}</div>
        <div><span class="text-gray-400">Location:</span> {{ switchItem.location }} {{ switchItem.rack }} {{ switchItem.rackPosition }}</div>
        <div><span class="text-gray-400">Management IP:</span> {{ switchItem.managementIp }}</div>
        <div><span class="text-gray-400">Serial:</span> {{ switchItem.serialNumber }}</div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data: switchItem } = await useFetch(`/api/switches/${route.params.id}`)
</script>
