<script setup lang="ts">
const { theme, toggleTheme, initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <button
    class="button button--ghost button--icon"
    type="button"
    :aria-label="`Current theme: ${theme}. Toggle theme`"
    @click="toggleTheme"
  >
    <span v-if="theme === 'dark'">🌙</span>
    <span v-else>☀️</span>
    <span>{{ theme === 'dark' ? 'Dark' : 'Light' }}</span>
  </button>
</template>
