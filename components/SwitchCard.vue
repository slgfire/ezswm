<script setup lang="ts">
defineProps<{ title: string; value: string | number }>()
</script>

<template>
  <div class="stat">
    <div>{{ title }}</div>
    <h2>{{ value }}</h2>
  </div>
</template>
