<script setup lang="ts">
const route = useRoute()
await navigateTo(`/settings/port-layouts/${route.params.id}`, { replace: true })
</script>

<template>
  <div class="panel">Redirecting…</div>
</template>
