<template>
  <div class="p-4 sm:p-6">
    <div class="mb-5 sm:mb-6">
      <h1 class="text-2xl font-bold">{{ $t('nav.dashboard') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ $t('dashboard.description') }}</p>
    </div>

    <div v-if="loading" class="text-muted">{{ $t('common.loading') }}</div>

    <div v-else-if="loadError" class="mt-6" role="alert" data-testid="dashboard-load-error">
      <SharedEmptyState
        icon="i-heroicons-exclamation-triangle"
        :title="$t('dashboard.loadErrorTitle')"
        :description="$t('dashboard.loadErrorDescription')"
      >
        <template #action>
          <UButton icon="i-heroicons-arrow-path" color="neutral" variant="outline" :loading="loading" @click="loadStats">
            {{ $t('common.retry') }}
          </UButton>
        </template>
      </SharedEmptyState>
    </div>

    <div v-else-if="stats && hasSomeData" class="space-y-4 sm:space-y-5">
      <!-- KPI tiles: label row on top, one large neutral number; icons carry the accent color -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" data-testid="dashboard-kpis">
        <NuxtLink
          v-for="kpi in kpis"
          :key="kpi.key"
          :to="kpi.to"
          class="stagger-item card-glow group flex min-h-11 flex-col gap-3 rounded-lg bg-default p-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 sm:p-4 dark:focus-visible:outline-primary"
          :data-testid="`dashboard-kpi-${kpi.key}`"
        >
          <!-- Phones: icon above the label so long labels get the full tile width -->
          <div class="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" :class="kpi.iconBg">
              <UIcon :name="kpi.icon" class="h-4 w-4" :class="kpi.iconColor" aria-hidden="true" />
            </span>
            <span class="min-w-0 text-xs font-medium leading-tight text-muted sm:text-sm" data-testid="dashboard-kpi-label">{{ kpi.label }}</span>
            <UIcon name="i-heroicons-chevron-right" class="ml-auto hidden h-4 w-4 shrink-0 text-dimmed transition-transform group-hover:translate-x-0.5 group-hover:text-muted sm:block" aria-hidden="true" />
          </div>
          <div class="font-display text-2xl font-bold tabular-nums leading-none text-highlighted sm:text-3xl" data-testid="dashboard-kpi-value">{{ kpi.value }}</div>
        </NuxtLink>
      </div>

      <!-- Favorite switches and subnets -->
      <section v-if="stats.favorites?.switches?.length || stats.favorites?.networks?.length" class="stagger-item" data-testid="dashboard-favorites">
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-toned">
          <UIcon name="i-heroicons-star-solid" class="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          {{ $t('dashboard.favorites') }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="fav in stats.favorites.switches"
            :key="fav.id"
            :to="`/sites/${siteId}/switches/${fav.id}`"
            class="card-glow flex min-h-11 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-default px-3 py-1.5 text-sm transition-colors hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:hover:text-primary-400 dark:focus-visible:outline-primary"
          >
            <UIcon name="i-heroicons-server-stack" class="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span class="min-w-0 break-words font-medium">{{ fav.name }}</span>
            <UBadge v-if="fav.role" :color="roleColor(fav.role)" variant="subtle" size="xs">
              {{ $t(`switches.roles.${fav.role}`) }}
            </UBadge>
            <span v-if="fav.location" class="min-w-0 break-words text-xs text-muted">{{ fav.location }}</span>
            <code v-if="fav.management_ip" class="shrink-0 font-mono text-[11px] text-toned">{{ fav.management_ip }}</code>
          </NuxtLink>
          <NuxtLink
            v-for="net in stats.favorites.networks"
            :key="net.id"
            :to="`/sites/${siteId}/subnets/${net.slug || net.id}`"
            class="card-glow flex min-h-11 max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-default px-3 py-1.5 text-sm transition-colors hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:hover:text-primary-400 dark:focus-visible:outline-primary"
          >
            <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span class="min-w-0 break-words font-medium">{{ net.name }}</span>
            <code class="shrink-0 font-mono text-[11px] text-toned">{{ net.subnet }}</code>
          </NuxtLink>
        </div>
      </section>

      <!-- Health row: port status next to the wider IP utilization -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <UCard class="stagger-item" :ui="cardUi" data-testid="dashboard-port-status">
          <template #header><h2 class="text-sm font-semibold">{{ $t('dashboard.portStatus') }}</h2></template>
          <div class="flex items-center gap-5">
            <!-- Visual ring -->
            <div class="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 36 36" class="h-24 w-24 -rotate-90" aria-hidden="true">
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
                <span class="font-display text-lg font-bold tabular-nums text-highlighted" data-testid="dashboard-port-total">{{ totalPorts }}</span>
                <span class="text-[10px] uppercase tracking-wider text-muted">{{ $t('dashboard.ports') }}</span>
              </div>
            </div>
            <!-- Legend -->
            <ul class="min-w-0 flex-1 space-y-2">
              <li class="flex items-center gap-2.5">
                <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
                <span class="text-sm text-muted">{{ $t('legend.up') }}</span>
                <span class="ml-auto font-display font-bold tabular-nums text-green-700 dark:text-green-500">{{ stats.portStatus.up }}</span>
              </li>
              <li class="flex items-center gap-2.5">
                <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gray-500" aria-hidden="true" />
                <span class="text-sm text-muted">{{ $t('legend.down') }}</span>
                <span class="ml-auto font-display font-bold tabular-nums text-toned">{{ stats.portStatus.down }}</span>
              </li>
              <li class="flex items-center gap-2.5">
                <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                <span class="text-sm text-muted">{{ $t('legend.disabled') }}</span>
                <span class="ml-auto font-display font-bold tabular-nums text-red-700 dark:text-red-500">{{ stats.portStatus.disabled }}</span>
              </li>
            </ul>
          </div>
        </UCard>

        <UCard class="stagger-item lg:col-span-2" :ui="cardUi" data-testid="dashboard-ip-utilization">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-semibold">{{ $t('dashboard.ipUtilization') }}</h2>
              <span v-if="stats.networkUtilization.length" class="text-xs text-muted">{{ $t('dashboard.subnetCount', stats.networkUtilization.length) }}</span>
            </div>
          </template>
          <SharedEmptyState
            v-if="!stats.networkUtilization.length"
            icon="i-heroicons-globe-alt"
            :title="$t('dashboard.ipUtilization')"
            :description="$t('dashboard.ipUtilizationEmpty')"
          />
          <div v-else class="space-y-2.5">
            <div v-for="net in visibleUtilization" :key="net.id">
              <div class="flex items-center gap-2">
                <span v-if="net.vlan_color" class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: net.vlan_color }" />
                <NuxtLink :to="`/sites/${siteId}/subnets/${net.slug || net.id}`" class="min-w-0 flex-1 truncate text-sm hover:text-primary-700 dark:hover:text-primary-400">{{ net.name }}</NuxtLink>
                <code class="shrink-0 font-mono text-[11px] text-toned">{{ net.subnet }}</code>
                <span class="w-10 shrink-0 text-right font-mono text-xs tabular-nums" :class="net.percentage > 80 ? 'text-red-700 dark:text-red-400' : net.percentage > 50 ? 'text-yellow-800 dark:text-yellow-400' : 'text-muted'">{{ net.percentage }}%</span>
              </div>
              <div class="mt-1 flex h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div class="h-full transition-all" :class="net.percentage > 80 ? 'bg-red-500' : 'bg-primary-500'" :style="{ width: `${Math.min(net.percentage, 100)}%` }" />
                <div v-if="net.dhcp_percent > 0" class="h-full bg-blue-500/60 transition-all" :style="{ width: `${Math.min(net.dhcp_percent, 100 - net.percentage)}%` }" />
                <div v-if="net.reserved_percent > 0" class="h-full bg-yellow-500/50 transition-all" :style="{ width: `${Math.min(net.reserved_percent, 100 - net.percentage - net.dhcp_percent)}%` }" />
              </div>
            </div>
          </div>
          <button
            v-if="sortedUtilization.length > UTIL_TOP_N"
            class="mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-md text-xs text-muted transition-colors hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-700 dark:hover:text-primary-400 dark:focus-visible:outline-primary"
            @click="showAllNetworks = !showAllNetworks"
          >
            <UIcon :name="showAllNetworks ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="h-3 w-3" />
            {{ showAllNetworks ? $t('common.showLess') : $t('common.showAll', { count: sortedUtilization.length }) }}
          </button>
          <div v-if="canEditInfrastructure && stats.networkUtilization.length > 0 && stats.networkUtilization.length <= 1" class="mt-3 flex items-center gap-2 text-xs text-toned">
            <UIcon name="i-heroicons-light-bulb" class="h-3.5 w-3.5 text-yellow-500" />
            <NuxtLink :to="`/sites/${siteId}/subnets/create`" class="hover:text-primary-700 dark:hover:text-primary-400">{{ $t('dashboard.addSubnetsHint') }}</NuxtLink>
          </div>
          <template v-if="stats.networkUtilization.some((n: any) => n.dhcp_percent > 0 || n.reserved_percent > 0)" #footer>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
              <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-primary-500" /> {{ $t('networks.infoBar.allocated') }}</span>
              <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-blue-500/60" /> {{ $t('networks.ranges.types.dhcp') }}</span>
              <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-yellow-500/50" /> {{ $t('networks.ranges.types.reserved') }}</span>
              <span class="flex items-center gap-1"><span class="inline-block h-2 w-2 rounded-full bg-gray-500/30" /> {{ $t('common.free') }}</span>
            </div>
          </template>
        </UCard>
      </div>

      <!-- Attention + history row; the remaining card takes the full width when the other is absent -->
      <div v-if="hasWarnings || stats.recentActivity.length" class="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <!-- Warnings -->
        <UCard v-if="hasWarnings" class="stagger-item" :class="{ 'lg:col-span-3': !stats.recentActivity.length }" :ui="cardUi" data-testid="dashboard-warnings">
          <template #header>
            <h2 class="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-500">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4" aria-hidden="true" />
              {{ $t('dashboard.warnings') }}
            </h2>
          </template>
          <div class="space-y-2">
            <NuxtLink
              v-for="net in stats.highUsageNetworks"
              :key="net.id"
              :to="`/sites/${siteId}/subnets/${net.id}`"
              class="flex items-center gap-2 rounded-md border-l-2 border-yellow-500 bg-yellow-500/5 px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:text-yellow-400 dark:focus-visible:outline-primary"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 shrink-0" />
              {{ $t('dashboard.highUsageItem', { name: net.name, percent: net.percentage }) }}
            </NuxtLink>
            <div v-for="ip in stats.duplicateIps" :key="ip" class="flex items-center gap-2 rounded-md border-l-2 border-red-500 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <UIcon name="i-heroicons-exclamation-circle" class="h-4 w-4 shrink-0" />
              {{ $t('dashboard.duplicateIp') }}: <span class="font-mono">{{ ip }}</span>
            </div>
            <NuxtLink
              v-for="vlan in stats.orphanVlans"
              :key="vlan.id"
              :to="`/sites/${siteId}/vlans/${vlan.id}`"
              class="flex items-center gap-2 rounded-md border-l-2 border-gray-500 bg-gray-500/5 px-3 py-2 text-sm text-toned transition-colors hover:bg-gray-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:focus-visible:outline-primary"
            >
              <UIcon name="i-heroicons-information-circle" class="h-4 w-4 shrink-0" />
              {{ $t('dashboard.orphanVlan', { name: vlan.name, id: vlan.vlan_id }) }}
            </NuxtLink>
          </div>
        </UCard>

        <!-- Recent Activity -->
        <UCard v-if="stats.recentActivity.length" class="stagger-item" :class="hasWarnings ? 'lg:col-span-2' : 'lg:col-span-3'" :ui="cardUi" data-testid="dashboard-activity">
          <template #header><h2 class="text-sm font-semibold">{{ $t('dashboard.recentActivity') }}</h2></template>
          <div class="space-y-1">
            <div v-for="entry in stats.recentActivity" :key="entry.id" class="rounded px-1 py-1.5 text-sm alt-row">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  :class="entry.action === 'create' ? 'bg-green-500/15 text-green-500' : entry.action === 'delete' ? 'bg-red-500/15 text-red-500' : 'bg-primary-500/15 text-primary-500'"
                >
                  <UIcon
                    :name="entry.action === 'create' ? 'i-heroicons-plus' : entry.action === 'delete' ? 'i-heroicons-minus' : 'i-heroicons-pencil'"
                    class="h-3 w-3"
                  />
                </span>
                <span class="font-mono text-xs text-toned">{{ entry.entity_type }}</span>
                <NuxtLink
                  v-if="activityLink(entry)"
                  :to="activityLink(entry)"
                  class="truncate font-medium hover:text-primary-700 dark:hover:text-primary-400"
                >{{ entry.entity_name }}</NuxtLink>
                <span v-else class="truncate font-medium">{{ entry.entity_name }}</span>
                <span class="ml-auto shrink-0 text-xs text-toned">{{ relTime(entry.timestamp) }}</span>
              </div>
              <div v-if="formatActivity(entry)" class="ml-7 mt-0.5 truncate text-xs text-muted">{{ formatActivity(entry) }}</div>
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
          <UButton v-if="canEditInfrastructure" :to="`/sites/${siteId}/switches/create`" icon="i-heroicons-plus">
            {{ $t('switches.create') }}
          </UButton>
        </template>
      </SharedEmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatActivitySummary as _formatActivitySummary } from '~/utils/activityFormat'
import { relativeTime as _relativeTime } from '~/utils/timeFormat'
import type { ActivityEntry } from '~~/types/activity'
import type { Network } from '~~/types/network'
import type { Switch } from '~~/types/switch'

const { t } = useI18n()

interface DashboardStats {
  counts: { switches: number; vlans: number; networks: number; allocations: number }
  portStatus: { up: number; down: number; disabled: number }
  networkUtilization: { id: string; slug?: string; name: string; subnet: string; total_hosts: number; allocated: number; ranges: number; percentage: number; dhcp_percent: number; reserved_percent: number; vlan_color: string | null; vlan_name: string | null; vlan_id: number | null }[]
  orphanVlans: { id: string; vlan_id: number; name: string }[]
  highUsageNetworks: { id: string; name: string; subnet: string; percentage: number }[]
  duplicateIps: string[]
  favorites: { switches: Omit<Switch, 'ports'>[]; networks: Network[] }
  recentActivity: ActivityEntry[]
}

const formatActivity = (entry: ActivityEntry) => _formatActivitySummary(entry, t)
const relTime = (ts: string) => _relativeTime(ts, t)
const route = useRoute()
const siteId = computed(() => route.params.siteId as string)
const { canEditInfrastructure } = useAuth()
useHead({ title: 'Dashboard' })

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const loadError = ref(false)

const hasSomeData = computed(() =>
  stats.value && (stats.value.counts.switches > 0 || stats.value.counts.vlans > 0 || stats.value.counts.networks > 0)
)

// Compact, consistent section cards
const cardUi = { header: 'px-4 py-3 sm:px-5', body: 'p-4 sm:p-5', footer: 'px-4 py-2.5 sm:px-5' }

const hasWarnings = computed(() =>
  !!stats.value && (stats.value.highUsageNetworks.length > 0 || stats.value.duplicateIps.length > 0 || stats.value.orphanVlans.length > 0)
)

const kpis = computed(() => {
  const counts = stats.value?.counts
  const base = `/sites/${siteId.value}`
  return [
    { key: 'switches', to: `${base}/switches`, label: t('dashboard.switchCount'), value: counts?.switches ?? 0, icon: 'i-heroicons-server-stack', iconBg: 'bg-primary-500/10', iconColor: 'text-primary-500' },
    { key: 'subnets', to: `${base}/subnets`, label: t('dashboard.networkCount'), value: counts?.networks ?? 0, icon: 'i-heroicons-globe-alt', iconBg: 'bg-sky-500/10', iconColor: 'text-sky-500' },
    { key: 'vlans', to: `${base}/vlans`, label: t('dashboard.vlanCount'), value: counts?.vlans ?? 0, icon: 'i-heroicons-tag', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
    { key: 'ip-allocations', to: `${base}/ip-addresses`, label: t('dashboard.ipAllocations'), value: counts?.allocations ?? 0, icon: 'i-heroicons-map-pin', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' }
  ]
})

const totalPorts = computed(() =>
  (stats.value?.portStatus?.up || 0) + (stats.value?.portStatus?.down || 0) + (stats.value?.portStatus?.disabled || 0)
)

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
function roleColor(role: string): BadgeColor {
  const map: Record<string, BadgeColor> = { core: 'error', distribution: 'info', access: 'success', management: 'warning' }
  return map[role] || 'neutral'
}

const portUpPercent = computed(() =>
  totalPorts.value > 0 ? (stats.value!.portStatus!.up / totalPorts.value) * 100 : 0
)

const portDisabledPercent = computed(() =>
  totalPorts.value > 0 ? (stats.value!.portStatus!.disabled / totalPorts.value) * 100 : 0
)

const UTIL_TOP_N = 10
const showAllNetworks = ref(false)
const sortedUtilization = computed(() =>
  [...(stats.value?.networkUtilization ?? [])].sort((a, b) => b.percentage - a.percentage)
)
const visibleUtilization = computed(() =>
  showAllNetworks.value ? sortedUtilization.value : sortedUtilization.value.slice(0, UTIL_TOP_N)
)


function activityLink(entry: ActivityEntry): string | undefined {
  if (!entry.entity_id) return undefined
  const base = `/sites/${siteId.value}`
  switch (entry.entity_type) {
    case 'switch': return `${base}/switches/${entry.entity_id}`
    case 'vlan': return `${base}/vlans`
    case 'network': return `${base}/subnets/${entry.entity_id}`
    default: return undefined
  }
}

let inFlight: Promise<void> | null = null

// Retry reuses the in-flight request instead of firing a second one.
function loadStats() {
  inFlight ??= (async () => {
    loading.value = true
    loadError.value = false
    try {
      const params: Record<string, string> = {}
      if (siteId.value && siteId.value !== 'all') params.site_id = siteId.value
      stats.value = await $fetch<DashboardStats>('/api/dashboard/stats', { params })
    } catch {
      // Generic translated message only; backend error text is not shown.
      loadError.value = true
    } finally {
      loading.value = false
      inFlight = null
    }
  })()
  return inFlight
}

onMounted(loadStats)
</script>
