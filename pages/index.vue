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
  <div class="stack">
    <div class="stats">
      <SwitchCard title="Switches" :value="stats.totalSwitches" />
      <SwitchCard title="Active switches" :value="stats.activeSwitches" />
      <SwitchCard title="Used ports" :value="stats.usedPorts" />
      <SwitchCard title="Port utilization" :value="`${stats.utilization}%`" />
      <SwitchCard title="Networks" :value="ipamStats.totalNetworks" />
      <SwitchCard title="Assigned IPs" :value="ipamStats.totalAssigned" />
    </div>

    <div class="dashboard-grid">
      <div class="panel stack">
        <h3>Infrastructure utilization</h3>
        <div>
          <p>Port capacity</p>
          <div class="util" style="margin-top: .45rem;">
            <div class="util-bar" :style="{ width: `${stats.utilization}%` }" />
          </div>
          <small>{{ stats.usedPorts }} of {{ stats.totalPorts || 0 }} ports in use</small>
        </div>
        <div>
          <p>IP capacity</p>
          <div class="util" style="margin-top: .45rem;">
            <div class="util-bar" :style="{ width: `${ipamStats.totalUtilization}%` }" />
          </div>
          <small>{{ ipamStats.totalAssigned }} of {{ ipamStats.totalCapacity || 0 }} usable IPs assigned</small>
        </div>
      </div>

      <div class="panel stack">
        <h3>Top utilized subnets</h3>
        <div class="dashboard-list">
          <div v-for="item in ipamStats.topUtilized" :key="item.name" class="dashboard-list__item">
            <div>
              <strong>{{ item.name }}</strong>
              <small style="display:block;">VLAN {{ item.vlan ?? '—' }}</small>
            </div>
            <span class="badge badge--neutral">{{ item.utilization }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
