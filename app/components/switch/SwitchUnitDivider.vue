<template>
  <div class="my-4 flex items-center gap-3">
    <div class="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
    <span class="rounded-full bg-neutral-200 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">{{ label }}</span>
    <div class="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
