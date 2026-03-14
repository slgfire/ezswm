<script setup lang="ts">
const { t } = useI18n()
const { data, refresh } = await useFetch('/api/dashboard')

const handleRefresh = async () => {
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.dashboard.title')"
      :description="t('pages.dashboard.description')"
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.switches') }}</p>
        <p class="text-3xl font-semibold">{{ data?.switches ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.activeSwitches') }}</p>
        <p class="text-3xl font-semibold">{{ data?.activeSwitches ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.usedPorts') }}</p>
        <p class="text-3xl font-semibold">{{ data?.usedPorts ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.portUtilization') }}</p>
        <p class="text-3xl font-semibold">{{ data?.portUtilization ?? 0 }}%</p>
        <UProgress class="mt-3" :model-value="data?.portUtilization ?? 0" />
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.networks') }}</p>
        <p class="text-3xl font-semibold">{{ data?.networks ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.assignedIps') }}</p>
        <p class="text-3xl font-semibold">{{ data?.assignedIps ?? 0 }}</p>
      </UCard>
    </div>

    <div class="grid gap-4 2xl:grid-cols-12">
      <UCard class="2xl:col-span-7">
        <template #header>
          <h2 class="text-lg font-semibold">{{ t('dashboard.infrastructureUtilization') }}</h2>
        </template>

        <div class="space-y-6">
          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span>{{ t('kpi.portUtilization') }}</span>
              <span>{{ data?.portUtilization ?? 0 }}%</span>
            </div>
            <UProgress :model-value="data?.portUtilization ?? 0" />
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span>{{ t('dashboard.ipAllocation') }}</span>
              <span>{{ data?.assignedIps ?? 0 }} / {{ data?.networks ?? 0 }}</span>
            </div>
            <UProgress :model-value="data?.assignedIps ? Math.min(data.assignedIps, 100) : 0" />
          </div>
        </div>
      </UCard>

      <UCard class="2xl:col-span-5">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ t('dashboard.topSubnets') }}</h2>
            <UButton
              size="xs"
              icon="i-lucide-refresh-cw"
              variant="soft"
              @click="handleRefresh"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div
            v-for="entry in data?.subnetUsage || []"
            :key="entry.networkId"
            class="space-y-2"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="font-medium">{{ entry.name }}</span>
              <span>{{ entry.used }} / {{ entry.capacity }}</span>
            </div>
            <UProgress :model-value="entry.percent" />
          </div>
        </div>
      </UCard>

      <UCard class="2xl:col-span-6">
        <template #header>
          <h2 class="text-lg font-semibold">{{ t('dashboard.capacityOverview') }}</h2>
        </template>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1 rounded-lg border border-default p-4">
            <dt class="text-sm text-muted">{{ t('dashboard.totalSwitchPorts') }}</dt>
            <dd class="text-2xl font-semibold">{{ data?.usedPorts ?? 0 }}</dd>
          </div>
          <div class="space-y-1 rounded-lg border border-default p-4">
            <dt class="text-sm text-muted">{{ t('dashboard.availableNetworks') }}</dt>
            <dd class="text-2xl font-semibold">{{ data?.networks ?? 0 }}</dd>
          </div>
          <div class="space-y-1 rounded-lg border border-default p-4">
            <dt class="text-sm text-muted">{{ t('dashboard.activeRatio') }}</dt>
            <dd class="text-2xl font-semibold">{{ data?.activeSwitches ?? 0 }} / {{ data?.switches ?? 0 }}</dd>
          </div>
          <div class="space-y-1 rounded-lg border border-default p-4">
            <dt class="text-sm text-muted">{{ t('dashboard.addressPoolUse') }}</dt>
            <dd class="text-2xl font-semibold">{{ data?.assignedIps ?? 0 }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard class="2xl:col-span-6">
        <template #header>
          <h2 class="text-lg font-semibold">{{ t('dashboard.quickStatus') }}</h2>
        </template>

        <ul class="space-y-3 text-sm">
          <li class="flex items-center justify-between rounded-lg border border-default p-3">
            <span>{{ t('kpi.portUtilization') }}</span>
            <span class="font-medium">{{ data?.portUtilization ?? 0 }}%</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default p-3">
            <span>{{ t('kpi.activeSwitches') }}</span>
            <span class="font-medium">{{ data?.activeSwitches ?? 0 }}</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default p-3">
            <span>{{ t('kpi.assignedIps') }}</span>
            <span class="font-medium">{{ data?.assignedIps ?? 0 }}</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default p-3">
            <span>{{ t('kpi.networks') }}</span>
            <span class="font-medium">{{ data?.networks ?? 0 }}</span>
          </li>
        </ul>
      </UCard>
    </div>
  </div>
</template>
