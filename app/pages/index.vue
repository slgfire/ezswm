<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('nav.dashboard') }}</h1>

    <div v-if="loading" class="text-gray-400">{{ $t('common.loading') }}</div>

    <div v-else-if="stats && hasSomeData" class="space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink to="/switches" class="stagger-item card-glow block rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500/10">
              <UIcon name="i-heroicons-server-stack" class="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <div class="kpi-number font-display text-3xl font-bold">{{ stats.counts.switches }}</div>
              <div class="text-sm text-gray-400">{{ $t('dashboard.switchCount') }}</div>
            </div>
          </div>
        </NuxtLink>
        <NuxtLink to="/networks" class="stagger-item card-glow block rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <UIcon name="i-heroicons-globe-alt" class="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-green-500">{{ stats.counts.networks }}</div>
              <div class="text-sm text-gray-400">{{ $t('dashboard.networkCount') }}</div>
            </div>
          </div>
        </NuxtLink>
        <NuxtLink to="/vlans" class="stagger-item card-glow block rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <UIcon name="i-heroicons-tag" class="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-purple-500">{{ stats.counts.vlans }}</div>
              <div class="text-sm text-gray-400">{{ $t('dashboard.vlanCount') }}</div>
            </div>
          </div>
        </NuxtLink>
        <NuxtLink to="/networks" class="stagger-item card-glow block rounded-lg bg-default p-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <UIcon name="i-heroicons-map-pin" class="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div class="font-display text-3xl font-bold text-orange-500">{{ stats.counts.allocations }}</div>
              <div class="text-sm text-gray-400">IP Allocations</div>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Port Status + Warnings -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard class="stagger-item">
          <template #header><h2 class="font-semibold">{{ $t('dashboard.portStatus') }}</h2></template>
          <div class="flex items-center gap-6">
            <!-- Visual ring -->
            <div class="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 36 36" class="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke-width="3" class="stroke-gray-200 dark:stroke-gray-700" />
                <circle
                  cx="18" cy="18" r="15.915" fill="none" stroke-width="3"
                  stroke-linecap="round"
                  class="stroke-green-500"
                  :stroke-dasharray="`${portUpPercent} ${100 - portUpPercent}`"
                  stroke-dashoffset="0"
                />
                <circle
                  cx="18" cy="18" r="15.915" fill="none" stroke-width="3"
                  stroke-linecap="round"
                  class="stroke-red-500"
                  :stroke-dasharray="`${portDisabledPercent} ${100 - portDisabledPercent}`"
                  :stroke-dashoffset="`${-portUpPercent}`"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="font-display text-lg font-bold text-white">{{ totalPorts }}</span>
                <span class="text-[10px] uppercase tracking-wider text-gray-400">Ports</span>
              </div>
            </div>
            <!-- Legend -->
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="inline-block h-3 w-3 rounded-full bg-green-500" />
                <span class="text-sm text-gray-400">Up</span>
                <span class="font-display font-bold text-green-500">{{ stats.portStatus.up }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="inline-block h-3 w-3 rounded-full bg-gray-500" />
                <span class="text-sm text-gray-400">Down</span>
                <span class="font-display font-bold text-gray-500">{{ stats.portStatus.down }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="inline-block h-3 w-3 rounded-full bg-red-500" />
                <span class="text-sm text-gray-400">Disabled</span>
                <span class="font-display font-bold text-red-500">{{ stats.portStatus.disabled }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Warnings -->
        <UCard v-if="stats.highUsageNetworks.length || stats.duplicateIps.length || stats.orphanVlans.length" class="stagger-item">
          <template #header><h2 class="font-semibold text-amber-500">{{ $t('dashboard.warnings') }}</h2></template>
          <div class="space-y-2">
            <div v-for="net in stats.highUsageNetworks" :key="net.id" class="flex items-center gap-2 rounded-md border-l-2 border-yellow-500 bg-yellow-500/5 px-3 py-2 text-sm text-yellow-400">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 shrink-0" />
              {{ net.name }}: {{ net.percentage }}% utilization
            </div>
            <div v-for="ip in stats.duplicateIps" :key="ip" class="flex items-center gap-2 rounded-md border-l-2 border-red-500 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              <UIcon name="i-heroicons-exclamation-circle" class="h-4 w-4 shrink-0" />
              Duplicate IP: <span class="font-mono">{{ ip }}</span>
            </div>
            <div v-for="vlan in stats.orphanVlans" :key="vlan.id" class="flex items-center gap-2 rounded-md border-l-2 border-gray-500 bg-gray-500/5 px-3 py-2 text-sm text-gray-400">
              <UIcon name="i-heroicons-information-circle" class="h-4 w-4 shrink-0" />
              Orphan VLAN: {{ vlan.name }} ({{ vlan.vlan_id }})
            </div>
          </div>
        </UCard>
      </div>

      <!-- IP Utilization + Recent Activity side by side -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard v-if="stats.networkUtilization.length" class="stagger-item">
          <template #header><h2 class="font-semibold">{{ $t('dashboard.ipUtilization') }}</h2></template>
          <div class="space-y-4">
            <div v-for="net in stats.networkUtilization" :key="net.id" class="space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 min-w-0">
                  <span v-if="net.vlan_color" class="inline-block h-2.5 w-2.5 shrink-0 rounded" :style="{ backgroundColor: net.vlan_color }" />
                  <NuxtLink :to="`/networks/${net.id}`" class="truncate text-sm hover:text-primary-400">{{ net.name }}</NuxtLink>
                  <span v-if="net.vlan_name" class="hidden text-xs text-gray-500 sm:inline">VLAN {{ net.vlan_id }}</span>
                </div>
                <span class="font-mono text-sm" :class="net.percentage > 80 ? 'text-red-400' : net.percentage > 50 ? 'text-yellow-400' : 'text-gray-400'">{{ net.percentage }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  class="h-2 rounded-full transition-all"
                  :style="{
                    width: `${Math.min(net.percentage, 100)}%`,
                    backgroundColor: net.percentage > 80 ? undefined : net.vlan_color || undefined
                  }"
                  :class="net.percentage > 80 ? 'bg-red-500' : net.percentage > 50 ? 'bg-yellow-500' : net.vlan_color ? '' : 'bg-primary-500'"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Recent Activity -->
        <UCard v-if="stats.recentActivity.length" class="stagger-item">
          <template #header><h2 class="font-semibold">{{ $t('dashboard.recentActivity') }}</h2></template>
          <div class="space-y-1">
            <div v-for="entry in stats.recentActivity" :key="entry.id" class="flex items-center gap-2 rounded px-1 py-1.5 text-sm alt-row">
              <span
                class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
                :class="entry.action === 'create' ? 'bg-green-500/15 text-green-500' : entry.action === 'delete' ? 'bg-red-500/15 text-red-500' : 'bg-primary-500/15 text-primary-500'"
              >
                <UIcon
                  :name="entry.action === 'create' ? 'i-heroicons-plus' : entry.action === 'delete' ? 'i-heroicons-minus' : 'i-heroicons-pencil'"
                  class="h-3 w-3"
                />
              </span>
              <span class="font-mono text-xs text-gray-500">{{ entry.entity_type }}</span>
              <NuxtLink
                v-if="activityLink(entry)"
                :to="activityLink(entry)"
                class="truncate font-medium hover:text-primary-400"
              >{{ entry.entity_name }}</NuxtLink>
              <span v-else class="truncate font-medium">{{ entry.entity_name }}</span>
              <span class="ml-auto shrink-0 text-xs text-gray-500">{{ relativeTime(entry.timestamp) }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="mt-6">
      <SharedEmptyState
        icon="i-heroicons-server-stack"
        :title="$t('dashboard.emptyTitle')"
        :description="$t('dashboard.emptyDescription')"
      >
        <template #action>
          <UButton to="/switches/create" icon="i-heroicons-plus">
            {{ $t('switches.create') }}
          </UButton>
        </template>
      </SharedEmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = ref<any>(null)
const loading = ref(true)

const hasSomeData = computed(() =>
  stats.value && (stats.value.counts.switches > 0 || stats.value.counts.vlans > 0 || stats.value.counts.networks > 0)
)

const totalPorts = computed(() =>
  (stats.value?.portStatus?.up || 0) + (stats.value?.portStatus?.down || 0) + (stats.value?.portStatus?.disabled || 0)
)

const portUpPercent = computed(() =>
  totalPorts.value > 0 ? (stats.value.portStatus.up / totalPorts.value) * 100 : 0
)

const portDisabledPercent = computed(() =>
  totalPorts.value > 0 ? (stats.value.portStatus.disabled / totalPorts.value) * 100 : 0
)

function relativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours}h`
  const days = Math.floor(hours / 24)
  return `vor ${days}d`
}

function activityLink(entry: any): string | null {
  if (!entry.entity_id) return null
  switch (entry.entity_type) {
    case 'switch': return `/switches/${entry.entity_id}`
    case 'vlan': return `/vlans`
    case 'network': return `/networks/${entry.entity_id}`
    default: return null
  }
}

onMounted(async () => {
  try {
    stats.value = await $fetch('/api/dashboard/stats')
  } catch {
  } finally {
    loading.value = false
  }
})
</script>
