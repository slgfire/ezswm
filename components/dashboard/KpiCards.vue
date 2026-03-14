<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <UCard v-for="item in cards" :key="item.label">
      <p class="text-sm text-gray-500">{{ item.label }}</p>
      <p class="text-2xl font-semibold">{{ item.value }}</p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
defineProps<{ cards: { label: string, value: number | string }[] }>()
</script>
