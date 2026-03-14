<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  value: string | number
  description?: string
  icon?: string
}>(), {
  description: undefined,
  icon: undefined
})
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-muted">{{ title }}</p>
        <h2 class="text-2xl font-semibold text-highlighted">{{ value }}</h2>
        <p v-if="description" class="text-xs text-muted">{{ description }}</p>
      </div>

      <div v-if="icon" class="rounded-lg border border-default bg-elevated p-2 text-muted">
        <UIcon :name="icon" class="size-4" />
      </div>
    </div>
  </UCard>
</template>
