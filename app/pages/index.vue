<template>
  <div />
</template>

<script setup lang="ts">
// Redirect to default site or sites list
const { data: sites } = await useFetch<any[]>('/api/sites')
if (sites.value && sites.value.length > 0) {
  await navigateTo(`/sites/${sites.value[0].id}`, { replace: true })
} else {
  await navigateTo('/sites', { replace: true })
}
</script>
