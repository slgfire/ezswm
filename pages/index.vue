<script setup lang="ts">
const { data: switches } = await useFetch('/api/switches')

const stats = computed(() => {
  const list = switches.value || []
  return {
    total: list.length,
    active: list.filter((s) => s.status === 'active').length,
    planned: list.filter((s) => s.status === 'planned').length,
    retired: list.filter((s) => s.status === 'retired').length
  }
})
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <div class="stats">
      <SwitchCard title="Switches gesamt" :value="stats.total" />
      <SwitchCard title="Aktiv" :value="stats.active" />
      <SwitchCard title="Geplant" :value="stats.planned" />
      <SwitchCard title="Außer Betrieb" :value="stats.retired" />
    </div>
  </div>
</template>
