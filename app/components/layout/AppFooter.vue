<template>
  <footer class="border-t border-gray-800 px-4 py-2 text-center text-xs text-gray-500">
    ezSWM v{{ version }} &mdash; GPL License
  </footer>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const version = config.public.appVersion
</script>
