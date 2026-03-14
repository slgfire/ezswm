<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="mb-6 flex items-end justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold">{{ title }}</h1>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
