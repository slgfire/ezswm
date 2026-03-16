<template>
  <div class="p-6">
    <h1 class="mb-6 text-2xl font-bold">{{ $t('nav.dashboard') }}</h1>

    <div v-if="loading" class="text-gray-400">{{ $t('common.loading') }}</div>

    <div v-else-if="stats && hasSomeData" class="space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-primary-500">{{ stats.counts.switches }}</div>
            <div class="text-sm text-gray-400">{{ $t('dashboard.switchCount') }}</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-500">{{ stats.counts.networks }}</div>
            <div class="text-sm text-gray-400">{{ $t('dashboard.networkCount') }}</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-purple-500">{{ stats.counts.vlans }}</div>
            <div class="text-sm text-gray-400">{{ $t('dashboard.vlanCount') }}</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-3xl font-bold text-orange-500">{{ stats.counts.allocations }}</div>
            <div class="text-sm text-gray-400">IP Allocations</div>
          </div>
        </UCard>
      </div>

      <!-- Port Status -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UCard>
          <template #header><h2 class="font-semibold">{{ $t('dashboard.portStatus') }}</h2></template>
          <div class="flex gap-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-green-500">{{ stats.portStatus.up }}</div>
              <div class="text-xs text-gray-400">Up</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-500">{{ stats.portStatus.down }}</div>
              <div class="text-xs text-gray-400">Down</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-500">{{ stats.portStatus.disabled }}</div>
              <div class="text-xs text-gray-400">Disabled</div>
            </div>
          </div>
        </UCard>

        <!-- Warnings -->
        <UCard v-if="stats.highUsageNetworks.length || stats.duplicateIps.length || stats.orphanVlans.length">
          <template #header><h2 class="font-semibold text-yellow-500">{{ $t('dashboard.warnings') }}</h2></template>
          <div class="space-y-2 text-sm">
            <div v-for="net in stats.highUsageNetworks" :key="net.id" class="text-yellow-400">
              {{ net.name }}: {{ net.percentage }}% utilization
            </div>
            <div v-for="ip in stats.duplicateIps" :key="ip" class="text-red-400">
              Duplicate IP: {{ ip }}
            </div>
            <div v-for="vlan in stats.orphanVlans" :key="vlan.id" class="text-gray-400">
              Orphan VLAN: {{ vlan.name }} ({{ vlan.vlan_id }})
            </div>
          </div>
        </UCard>
      </div>

      <!-- Network Utilization -->
      <UCard v-if="stats.networkUtilization.length">
        <template #header><h2 class="font-semibold">{{ $t('dashboard.ipUtilization') }}</h2></template>
        <div class="space-y-3">
          <div v-for="net in stats.networkUtilization" :key="net.id" class="flex items-center gap-3">
            <NuxtLink :to="`/networks/${net.id}`" class="w-40 truncate text-sm hover:text-primary-400">{{ net.name }}</NuxtLink>
            <div class="flex-1 rounded-full bg-gray-700 h-3">
              <div
                class="h-3 rounded-full"
                :class="net.percentage > 80 ? 'bg-red-500' : net.percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'"
                :style="{ width: `${Math.min(net.percentage, 100)}%` }"
              />
            </div>
            <span class="w-16 text-right text-sm text-gray-400">{{ net.percentage }}%</span>
          </div>
        </div>
      </UCard>

      <!-- Recent Activity -->
      <UCard v-if="stats.recentActivity.length">
        <template #header><h2 class="font-semibold">{{ $t('dashboard.recentActivity') }}</h2></template>
        <div class="space-y-2">
          <div v-for="entry in stats.recentActivity" :key="entry.id" class="flex items-center gap-2 text-sm">
            <UBadge
              size="xs"
              :color="entry.action === 'create' ? 'green' : entry.action === 'delete' ? 'red' : 'blue'"
            >
              {{ entry.action }}
            </UBadge>
            <span class="text-gray-400">{{ entry.entity_type }}:</span>
            <span>{{ entry.entity_name }}</span>
            <span class="ml-auto text-xs text-gray-500">{{ new Date(entry.timestamp).toLocaleString() }}</span>
          </div>
        </div>
      </UCard>
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

onMounted(async () => {
  try {
    stats.value = await $fetch('/api/dashboard/stats')
  } finally {
    loading.value = false
  }
})
</script>
