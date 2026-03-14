<script setup lang="ts">
const { data: switches } = await useFetch('/api/switches')
const { data: networks } = await useFetch('/api/networks')

const stats = computed(() => {
  const list = switches.value || []
  const totalPorts = list.reduce((acc, sw) => acc + (sw.ports?.length || 0), 0)
  const usedPorts = list.reduce((acc, sw) => acc + (sw.ports?.filter((port) => port.status === 'used').length || 0), 0)

  return {
    totalSwitches: list.length,
    activeSwitches: list.filter((s) => s.status === 'active').length,
    usedPorts,
    totalPorts,
    utilization: totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0
  }
})

const ipamStats = computed(() => {
  const list = (networks.value || []) as Array<{ name: string; vlanId?: number; maxHosts: number; allocations: Array<{ status: string }> }>
  const totals = list.reduce((acc, item) => {
    const assigned = item.allocations.filter((entry) => entry.status !== 'free').length
    acc.assigned += assigned
    acc.totalHosts += item.maxHosts
    return acc
  }, { assigned: 0, totalHosts: 0 })

  const topUtilized = [...list]
    .map((item) => ({
      name: item.name,
      vlan: item.vlanId,
      utilization: item.maxHosts > 0 ? Math.round((item.allocations.filter((entry) => entry.status !== 'free').length / item.maxHosts) * 100) : 0
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5)

  return {
    totalNetworks: list.length,
    totalAssigned: totals.assigned,
    totalCapacity: totals.totalHosts,
    totalUtilization: totals.totalHosts > 0 ? Math.round((totals.assigned / totals.totalHosts) * 100) : 0,
    topUtilized
  }
})
</script>

<template>
  <div class="stack dashboard-stack">
    <div class="stats kpi-grid">
      <SwitchCard title="Switches" :value="stats.totalSwitches" />
      <SwitchCard title="Active switches" :value="stats.activeSwitches" />
      <SwitchCard title="Used ports" :value="stats.usedPorts" />
      <SwitchCard title="Port utilization" :value="`${stats.utilization}%`" />
      <SwitchCard title="Networks" :value="ipamStats.totalNetworks" />
      <SwitchCard title="Assigned IPs" :value="ipamStats.totalAssigned" />
    </div>

    <div class="dashboard-grid dashboard-grid--main">
      <UCard class="stack dashboard-panel">
        <template #header><h3 class="panel-title">Infrastructure utilization</h3></template>
        <div>
          <p class="panel-label">Port capacity</p>
          <UProgress :model-value="stats.utilization" class="mt-2" />
          <small class="panel-caption">{{ stats.usedPorts }} of {{ stats.totalPorts || 0 }} ports in use</small>
        </div>
        <div>
          <p class="panel-label">IP capacity</p>
          <UProgress :model-value="ipamStats.totalUtilization" class="mt-2" color="success" />
          <small class="panel-caption">{{ ipamStats.totalAssigned }} of {{ ipamStats.totalCapacity || 0 }} usable IPs assigned</small>
        </div>
      </UCard>

      <UCard class="stack dashboard-panel">
        <template #header><h3 class="panel-title">Top utilized subnets</h3></template>
        <div class="dashboard-list">
          <div v-for="item in ipamStats.topUtilized" :key="item.name" class="dashboard-list__item subnet-list-item">
            <div>
              <strong>{{ item.name }}</strong>
              <small class="subnet-list-item__meta">VLAN {{ item.vlan ?? '—' }}</small>
            </div>
            <UBadge color="neutral" variant="subtle">{{ item.utilization }}%</UBadge>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
