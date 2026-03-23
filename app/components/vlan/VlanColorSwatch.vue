<template>
  <span
    class="inline-block rounded-sm border border-gray-700"
    :class="sizeClasses"
    :style="{ backgroundColor: color }"
    :title="color"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  color: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'sm'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'lg': return 'h-6 w-6'
    case 'md': return 'h-4 w-4'
    case 'sm':
    default: return 'h-3 w-3'
  }
})
</script>
