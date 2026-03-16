<template>
  <span class="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-gray-200">
    <VlanColorSwatch :color="color" size="sm" />
    <span>{{ vlanId }}</span>
    <span class="text-gray-400">{{ name }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  vlanId: number
  name: string
  color: string
}>()
</script>
