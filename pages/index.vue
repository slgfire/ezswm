<script setup lang="ts">
const { data: switches } = await useFetch('/api/switches')
const { data: networks } = await useFetch('/api/networks')

const stats = computed(() => {
  const list = switches.value || []
  return {
    total: list.length,
    active: list.filter((s) => s.status === 'active').length,
    planned: list.filter((s) => s.status === 'planned').length,
    retired: list.filter((s) => s.status === 'retired').length
  }
})

const ipamStats = computed(() => {
  const list = (networks.value || []) as Array<{ name: string; maxHosts: number; allocations: Array<{ status: string }> }>
  const totals = list.reduce((acc, item) => {
    const assigned = item.allocations.filter((entry) => entry.status !== 'free').length
    acc.assigned += assigned
    acc.totalHosts += item.maxHosts
    return acc
  }, { assigned: 0, totalHosts: 0 })

  const topUtilized = [...list]
    .map((item) => ({
      name: item.name,
      utilization: item.maxHosts > 0 ? Math.round((item.allocations.filter((entry) => entry.status !== 'free').length / item.maxHosts) * 100) : 0
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 3)

  return {
    totalNetworks: list.length,
    totalAssigned: totals.assigned,
    topUtilized
  }
})
</script>

<template>
  <div class="stack">
    <div>
      <h1>Dashboard</h1>
      <div class="stats">
        <SwitchCard title="Total switches" :value="stats.total" />
        <SwitchCard title="Active" :value="stats.active" />
        <SwitchCard title="Planned" :value="stats.planned" />
        <SwitchCard title="Retired" :value="stats.retired" />
      </div>
    </div>

    <div class="panel">
      <h3 class="section-title">IPAM overview</h3>
      <div class="stats">
        <SwitchCard title="Total networks" :value="ipamStats.totalNetworks" />
        <SwitchCard title="Assigned IPs" :value="ipamStats.totalAssigned" />
      </div>
      <div style="margin-top: .8rem;">
        <strong>Top utilized networks</strong>
        <div v-for="item in ipamStats.topUtilized" :key="item.name" class="row row-between" style="margin-top:.35rem;">
          <span>{{ item.name }}</span>
          <span class="badge badge--neutral">{{ item.utilization }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
