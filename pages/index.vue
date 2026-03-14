<script setup lang="ts">
const { data: switches } = await useFetch('/api/switches')
const { data: networks } = await useFetch('/api/networks')

const stats = computed(() => {
  const list = switches.value || []
  const totalPorts = list.reduce((acc, sw) => acc + (sw.ports?.length || 0), 0)
  const usedPorts = list.reduce((acc, sw) => acc + (sw.ports?.filter((port) => port.status === 'used').length || 0), 0)

  return {
    totalSwitches: list.length,
    activeSwitches: list.filter((item) => item.status === 'active').length,
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
    .map((item) => {
      const used = item.allocations.filter((entry) => entry.status !== 'free').length
      const total = item.maxHosts
      return {
        name: item.name,
        vlan: item.vlanId,
        used,
        total,
        utilization: total > 0 ? Math.round((used / total) * 100) : 0
      }
    })
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
  <UContainer class="py-2 sm:py-4">
    <div class="space-y-6">
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SwitchCard
          title="Switches"
          :value="stats.totalSwitches"
          description="Total managed devices"
          icon="i-lucide-server"
        />
        <SwitchCard
          title="Active switches"
          :value="stats.activeSwitches"
          description="Operational right now"
          icon="i-lucide-circle-check"
        />
        <SwitchCard
          title="Used ports"
          :value="stats.usedPorts"
          description="Ports currently allocated"
          icon="i-lucide-plug"
        />
        <SwitchCard
          title="Port utilization"
          :value="`${stats.utilization}%`"
          description="Across all switch ports"
          icon="i-lucide-chart-column"
        />
        <SwitchCard
          title="Networks"
          :value="ipamStats.totalNetworks"
          description="Provisioned VLAN segments"
          icon="i-lucide-network"
        />
        <SwitchCard
          title="Assigned IPs"
          :value="ipamStats.totalAssigned"
          description="IPs in active use"
          icon="i-lucide-globe"
        />
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <UCard class="xl:col-span-3">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-highlighted">Infrastructure utilization</h3>
                <p class="text-sm text-muted">Capacity overview for switching and IP pools</p>
              </div>
              <UIcon name="i-lucide-activity" class="size-5 text-muted" />
            </div>
          </template>

          <div class="space-y-5">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3 text-sm">
                <p class="font-medium text-highlighted">Port capacity</p>
                <p class="text-muted">{{ stats.usedPorts }} / {{ stats.totalPorts || 0 }}</p>
              </div>
              <UProgress :model-value="stats.utilization" />
              <p class="text-xs text-muted">{{ stats.utilization }}% of ports are currently in use</p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3 text-sm">
                <p class="font-medium text-highlighted">IP capacity</p>
                <p class="text-muted">{{ ipamStats.totalAssigned }} / {{ ipamStats.totalCapacity || 0 }}</p>
              </div>
              <UProgress :model-value="ipamStats.totalUtilization" color="success" />
              <p class="text-xs text-muted">{{ ipamStats.totalUtilization }}% of usable IP addresses are assigned</p>
            </div>
          </div>
        </UCard>

        <UCard class="xl:col-span-2">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-highlighted">Top utilized subnets</h3>
                <p class="text-sm text-muted">Highest IP consumption by network</p>
              </div>
              <UIcon name="i-lucide-zap" class="size-5 text-muted" />
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="item in ipamStats.topUtilized"
              :key="item.name"
              class="space-y-2 rounded-lg border border-default bg-elevated/40 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium text-highlighted">{{ item.name }}</p>
                <UBadge color="neutral" variant="subtle">VLAN {{ item.vlan ?? '—' }}</UBadge>
              </div>
              <div class="flex items-center justify-between gap-3 text-xs text-muted">
                <p>{{ item.used }} / {{ item.total || 0 }} IPs</p>
                <p>{{ item.utilization }}%</p>
              </div>
              <UProgress :model-value="item.utilization" color="success" />
            </div>
          </div>
        </UCard>
      </section>
    </div>
  </UContainer>
</template>
