<script setup lang="ts">
defineProps<{ title: string; value: string | number }>()
</script>

<template>
  <UCard class="stat-card">
    <p class="text-xs uppercase tracking-wider text-muted">{{ title }}</p>
    <h2 class="mt-2 text-2xl font-semibold">{{ value }}</h2>
  </UCard>
</template>
