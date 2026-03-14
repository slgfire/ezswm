<script setup lang="ts">
const { theme, toggleTheme, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <UButton
    color="neutral"
    variant="subtle"
    :icon="theme === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
    :label="theme === 'dark' ? 'Dark' : 'Light'"
    :aria-label="`Current theme: ${theme}. Toggle theme`"
    @click="toggleTheme"
  />
</template>
