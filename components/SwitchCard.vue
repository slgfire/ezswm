<script setup lang="ts">
defineProps<{ title: string; value: string | number }>()
</script>

<template>
  <UCard class="stat-card">
    <p class="stat-card__label">{{ title }}</p>
    <h2 class="stat-card__value">{{ value }}</h2>
  </UCard>
</template>
