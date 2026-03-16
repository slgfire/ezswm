<template>
  <div class="my-3 flex items-center gap-2">
    <div class="h-px flex-1 bg-gray-700" />
    <span class="text-xs text-gray-500">{{ label }}</span>
    <div class="h-px flex-1 bg-gray-700" />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
