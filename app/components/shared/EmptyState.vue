<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <UIcon v-if="icon" :name="icon" class="mb-4 h-12 w-12 text-muted" />
    <h3 class="text-lg font-medium text-default">{{ title }}</h3>
    <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>
