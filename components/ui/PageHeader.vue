<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="rounded-xl border border-default/80 bg-default/70 px-4 py-4 sm:px-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
