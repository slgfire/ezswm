<template>
  <div class="-mt-2 list-container rounded-lg bg-default">
    <button
      class="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-left cursor-pointer transition-colors hover:bg-elevated/50 rounded-t-lg"
      @click="emit('update:showDetails', !props.showDetails)"
    >
      <div>
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.subnet') }}</div>
        <div class="flex items-center gap-2">
          <SharedCopyButton :value="network.subnet"><span class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ network.subnet }}</span></SharedCopyButton>
          <UBadge v-if="isPointToPoint" variant="subtle" color="info" size="xs">{{ $t('networks.infoBar.pointToPoint') }}</UBadge>
          <UBadge v-else-if="isHostRoute" variant="subtle" color="warning" size="xs">{{ $t('networks.infoBar.hostRoute') }}</UBadge>
        </div>
      </div>
      <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="network.gateway">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.gateway') }}</div>
        <SharedCopyButton :value="network.gateway"><span class="font-mono text-sm font-semibold text-gray-900 dark:text-white">{{ network.gateway }}</span></SharedCopyButton>
      </div>
      <div v-if="network.gateway" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div>
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.mask') }}</div>
        <SharedCopyButton :value="subnetInfo.mask"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.mask }}</span></SharedCopyButton>
      </div>
      <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div>
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.hosts') }}</div>
        <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ subnetInfo.usableHosts.toLocaleString() }}</div>
      </div>
      <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div>
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.allocated') }}</div>
        <div class="text-sm font-semibold" :class="utilizationPercent > 80 ? 'text-red-500' : 'text-primary-500'">{{ allocationsCount }} <span class="text-xs font-normal text-gray-400">({{ utilizationPercent }}%)</span></div>
      </div>
      <div v-if="associatedVlan" class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
      <div v-if="associatedVlan">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.vlan') }}</div>
        <div class="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
          <div class="h-2 w-2 rounded-full" :style="{ backgroundColor: associatedVlan.color }" />
          {{ associatedVlan.vlan_id }} <span class="font-normal text-gray-400">{{ associatedVlan.name }}</span>
        </div>
      </div>
      <!-- Expand/collapse chevron -->
      <div class="ml-auto flex items-center">
        <UIcon name="i-heroicons-chevron-down" :class="['h-4 w-4 text-gray-400 transition-transform duration-200', showDetails ? 'rotate-180' : '']" />
      </div>
    </button>

    <!-- Expanded details -->
    <div v-show="showDetails" class="border-t border-default px-5 py-3 space-y-3">
      <div v-if="network.description">
        <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('common.description') }}</div>
        <p class="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{{ network.description }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <template v-if="isHostRoute">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.hostAddress') }}</div>
            <SharedCopyButton :value="subnetInfo.network"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.network }}</span></SharedCopyButton>
          </div>
        </template>
        <template v-else-if="isPointToPoint">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.endpointA') }}</div>
            <SharedCopyButton :value="subnetInfo.network"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.network }}</span></SharedCopyButton>
          </div>
          <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.endpointB') }}</div>
            <SharedCopyButton :value="subnetInfo.broadcast"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.broadcast }}</span></SharedCopyButton>
          </div>
        </template>
        <template v-else>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.network') }}</div>
            <SharedCopyButton :value="subnetInfo.network"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.network }}</span></SharedCopyButton>
          </div>
          <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.broadcast') }}</div>
            <SharedCopyButton :value="subnetInfo.broadcast"><span class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ subnetInfo.broadcast }}</span></SharedCopyButton>
          </div>
        </template>
        <template v-if="network.dns_servers?.length">
          <div class="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">{{ $t('networks.infoBar.dns') }}</div>
            <div class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ formatDns(network.dns_servers) }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Network } from '~~/types/network'
import type { VLAN } from '~~/types/vlan'

const props = defineProps<{
  network: Network
  subnetInfo: { network: string; broadcast: string; mask: string; totalHosts: number; usableHosts: number; prefix: number }
  isPointToPoint: boolean
  isHostRoute: boolean
  associatedVlan: VLAN | null
  allocationsCount: number
  utilizationPercent: number
  showDetails: boolean
  formatDns: (servers: string[]) => string
}>()

const emit = defineEmits<{ 'update:showDetails': [value: boolean] }>()
</script>
