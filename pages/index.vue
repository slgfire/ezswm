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

const kpiCards = computed(() => [
  {
    label: 'Switches',
    value: stats.value.totalSwitches,
    description: 'Total managed devices',
    icon: 'i-heroicons-server-stack'
  },
  {
    label: 'Active switches',
    value: stats.value.activeSwitches,
    description: 'Operational right now',
    icon: 'i-heroicons-check-circle'
  },
  {
    label: 'Used ports',
    value: stats.value.usedPorts,
    description: 'Ports currently allocated',
    icon: 'i-heroicons-plug'
  },
  {
    label: 'Port utilization',
    value: `${stats.value.utilization}%`,
    description: 'Across all switch ports',
    icon: 'i-heroicons-chart-bar-square'
  },
  {
    label: 'Networks',
    value: ipamStats.value.totalNetworks,
    description: 'Provisioned VLAN segments',
    icon: 'i-heroicons-circle-stack'
  },
  {
    label: 'Assigned IPs',
    value: ipamStats.value.totalAssigned,
    description: 'IPs in active use',
    icon: 'i-heroicons-globe-alt'
  }
])

const switchSummary = computed(() => {
  const list = switches.value || []
  const byStatus = {
    active: list.filter((item) => item.status === 'active').length,
    planned: list.filter((item) => item.status === 'planned').length,
    retired: list.filter((item) => item.status === 'retired').length
  }

  const highestUsage = [...list]
    .map((item) => {
      const usedPorts = item.ports?.filter((port) => port.status === 'used').length || 0
      const totalPorts = item.ports?.length || 0
      return {
        id: item.id,
        name: item.name,
        usedPorts,
        totalPorts,
        utilization: totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0
      }
    })
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 4)

  return {
    byStatus,
    highestUsage
  }
})

const portStatusStats = computed(() => {
  const ports = (switches.value || []).flatMap((item) => item.ports || [])
  const total = ports.length
  const used = ports.filter((port) => port.status === 'used').length
  const free = ports.filter((port) => port.status === 'free').length
  const disabled = ports.filter((port) => port.status === 'disabled').length
  const error = ports.filter((port) => port.status === 'error').length

  return [
    {
      label: 'Used',
      value: used,
      percent: total > 0 ? Math.round((used / total) * 100) : 0,
      color: 'primary' as const
    },
    {
      label: 'Free',
      value: free,
      percent: total > 0 ? Math.round((free / total) * 100) : 0,
      color: 'success' as const
    },
    {
      label: 'Disabled',
      value: disabled,
      percent: total > 0 ? Math.round((disabled / total) * 100) : 0,
      color: 'warning' as const
    },
    {
      label: 'Error',
      value: error,
      percent: total > 0 ? Math.round((error / total) * 100) : 0,
      color: 'error' as const
    }
  ]
})

const recentAllocations = computed(() => {
  const list = (networks.value || []) as Array<{
    id: string
    name: string
    allocations: Array<{ id: string; ipAddress: string; hostname?: string; serviceName?: string; status: string }>
  }>

  return list
    .flatMap((network) => network.allocations
      .filter((entry) => entry.status !== 'free')
      .map((entry) => ({
        ...entry,
        networkName: network.name
      })))
    .slice(-5)
    .reverse()
})
</script>

<template>
  <UContainer class="py-3 sm:py-5">
    <div class="space-y-7">
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <UCard v-for="card in kpiCards" :key="card.label" class="h-full">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">{{ card.label }}</p>
              <p class="text-3xl font-semibold text-highlighted">{{ card.value }}</p>
              <p class="text-xs text-muted">{{ card.description }}</p>
            </div>
            <div class="rounded-lg bg-elevated p-2">
              <UIcon :name="card.icon" class="size-5 text-muted" />
            </div>
          </div>
        </UCard>
      </section>

      <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="space-y-4 lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-highlighted">Infrastructure overview</h3>
                  <p class="text-sm text-muted">Capacity overview for switching and IP pools</p>
                </div>
                <UIcon name="i-heroicons-presentation-chart-line" class="size-5 text-muted" />
              </div>
            </template>

            <div class="space-y-5">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <p class="font-medium text-highlighted">Port capacity</p>
                  <p class="text-muted">{{ stats.usedPorts }} / {{ stats.totalPorts || 0 }}</p>
                </div>
                <UProgress :model-value="stats.utilization" />
                <p class="text-xs text-muted">{{ stats.utilization }}% of switch ports used</p>
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <p class="font-medium text-highlighted">IP capacity</p>
                  <p class="text-muted">{{ ipamStats.totalAssigned }} / {{ ipamStats.totalCapacity || 0 }}</p>
                </div>
                <UProgress :model-value="ipamStats.totalUtilization" color="success" />
                <p class="text-xs text-muted">{{ ipamStats.totalUtilization }}% of usable IP addresses assigned</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-highlighted">Switch summary</h3>
                  <p class="text-sm text-muted">Operational state and busiest devices</p>
                </div>
                <UIcon name="i-heroicons-cpu-chip" class="size-5 text-muted" />
              </div>
            </template>

            <div class="space-y-4">
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Active</p>
                  <p class="text-lg font-semibold text-highlighted">{{ switchSummary.byStatus.active }}</p>
                </div>
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Planned</p>
                  <p class="text-lg font-semibold text-highlighted">{{ switchSummary.byStatus.planned }}</p>
                </div>
                <div class="rounded-lg bg-elevated p-3">
                  <p class="text-xs text-muted">Retired</p>
                  <p class="text-lg font-semibold text-highlighted">{{ switchSummary.byStatus.retired }}</p>
                </div>
              </div>

              <div class="space-y-3">
                <div v-for="item in switchSummary.highestUsage" :key="item.id" class="space-y-1.5">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <p class="font-medium text-highlighted">{{ item.name }}</p>
                    <p class="text-muted">{{ item.usedPorts }} / {{ item.totalPorts }} ports</p>
                  </div>
                  <UProgress :model-value="item.utilization" />
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-highlighted">Port usage statistics</h3>
                  <p class="text-sm text-muted">Distribution across all switch ports</p>
                </div>
                <UIcon name="i-heroicons-chart-pie" class="size-5 text-muted" />
              </div>
            </template>

            <div class="space-y-3">
              <div v-for="item in portStatusStats" :key="item.label" class="space-y-1.5">
                <div class="flex items-center justify-between gap-3 text-sm">
                  <p class="font-medium text-highlighted">{{ item.label }}</p>
                  <p class="text-muted">{{ item.value }} ({{ item.percent }}%)</p>
                </div>
                <UProgress :model-value="item.percent" :color="item.color" />
              </div>
            </div>
          </UCard>
        </div>

        <div class="space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-highlighted">Top utilized subnets</h3>
                  <p class="text-sm text-muted">Highest IP consumption by network</p>
                </div>
                <UIcon name="i-heroicons-bolt" class="size-5 text-muted" />
              </div>
            </template>

            <div class="space-y-4">
              <div
                v-for="item in ipamStats.topUtilized"
                :key="item.name"
                class="space-y-2.5 rounded-lg border border-default bg-elevated/40 px-3 py-3"
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

          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-semibold text-highlighted">Recent IP allocations</h3>
                  <p class="text-sm text-muted">Latest assigned network addresses</p>
                </div>
                <UIcon name="i-heroicons-squares-plus" class="size-5 text-muted" />
              </div>
            </template>

            <div class="space-y-3">
              <div
                v-for="item in recentAllocations"
                :key="item.id"
                class="rounded-lg border border-default bg-elevated/40 px-3 py-2.5"
              >
                <p class="text-sm font-medium text-highlighted">{{ item.ipAddress }}</p>
                <p class="text-xs text-muted">{{ item.networkName }} · {{ item.hostname || item.serviceName || 'Unlabeled host' }}</p>
              </div>
              <p v-if="recentAllocations.length === 0" class="text-sm text-muted">No assigned IP addresses available.</p>
            </div>
          </UCard>
        </div>
      </section>
    </div>
  </UContainer>
</template>
