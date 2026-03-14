<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="mb-6 rounded-xl border border-default bg-default/60 p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>
