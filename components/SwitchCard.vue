<script setup lang="ts">
defineProps<{ title: string; value: string | number }>()
</script>

<template>
  <div class="stat">
    <div class="stat-label">{{ title }}</div>
    <h2 class="stat-value">{{ value }}</h2>
  </div>
</template>
