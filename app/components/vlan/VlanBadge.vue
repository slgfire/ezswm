<template>
  <span class="inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-1 text-xs font-medium text-default">
    <VlanColorSwatch :color="color" size="sm" />
    <span>{{ vlanId }}</span>
    <span class="text-muted">{{ name }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  vlanId: number
  name: string
  color: string
}>()
</script>
