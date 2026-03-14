<script setup lang="ts">
const { t } = useI18n()
const { data, refresh, pending } = await useFetch('/api/dashboard')

const handleRefresh = async () => {
  await refresh()
}

const ipAllocationPercent = computed(() => {
  const total = data.value?.networks || 0
  const assigned = data.value?.assignedIps || 0

  if (!total) {
    return 0
  }

  return Math.min(Math.round((assigned / total) * 100), 100)
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.dashboard.title')"
      :description="t('pages.dashboard.description')"
    >
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          :loading="pending"
          label="Refresh"
          @click="handleRefresh"
        />
      </template>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.switches') }}</p>
        <p class="mt-1 text-3xl font-semibold">{{ data?.switches ?? 0 }}</p>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm text-muted">{{ t('kpi.activeSwitches') }}</p>
          <UBadge color="success" variant="soft">{{ data?.activeSwitches ?? 0 }}</UBadge>
        </div>
        <p class="mt-1 text-3xl font-semibold">{{ data?.activeSwitches ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.usedPorts') }}</p>
        <p class="mt-1 text-3xl font-semibold">{{ data?.usedPorts ?? 0 }}</p>
      </UCard>

      <UCard>
        <p class="text-sm text-muted">{{ t('kpi.portUtilization') }}</p>
        <div class="mt-2 flex items-end justify-between">
          <p class="text-3xl font-semibold">{{ data?.portUtilization ?? 0 }}%</p>
          <UBadge color="primary" variant="soft">{{ t('dashboard.quickStatus') }}</UBadge>
        </div>
        <UProgress class="mt-3" :model-value="data?.portUtilization ?? 0" />
      </UCard>
    </div>

    <div class="grid gap-4 xl:grid-cols-12">
      <UCard class="xl:col-span-7">
        <template #header>
          <h2 class="text-base font-semibold">{{ t('dashboard.infrastructureUtilization') }}</h2>
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
            <UProgress :model-value="ipAllocationPercent" />
          </div>
        </div>
      </UCard>

      <UCard class="xl:col-span-5">
        <template #header>
          <h2 class="text-base font-semibold">{{ t('dashboard.topSubnets') }}</h2>
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
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">{{ t('dashboard.capacityOverview') }}</h2>
        </template>

        <dl class="space-y-3 text-sm">
          <div class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
            <dt>{{ t('dashboard.totalSwitchPorts') }}</dt>
            <dd class="font-semibold">{{ data?.usedPorts ?? 0 }}</dd>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
            <dt>{{ t('dashboard.availableNetworks') }}</dt>
            <dd class="font-semibold">{{ data?.networks ?? 0 }}</dd>
          </div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">{{ t('dashboard.quickStatus') }}</h2>
        </template>

        <ul class="space-y-3 text-sm">
          <li class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
            <span>{{ t('kpi.activeSwitches') }}</span>
            <span class="font-semibold">{{ data?.activeSwitches ?? 0 }} / {{ data?.switches ?? 0 }}</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default px-3 py-2">
            <span>{{ t('kpi.assignedIps') }}</span>
            <span class="font-semibold">{{ data?.assignedIps ?? 0 }}</span>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">{{ t('kpi.networks') }}</h2>
        </template>

        <div class="space-y-3">
          <div class="rounded-lg border border-default px-3 py-2">
            <p class="text-sm text-muted">{{ t('kpi.networks') }}</p>
            <p class="text-2xl font-semibold">{{ data?.networks ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-default px-3 py-2">
            <p class="text-sm text-muted">{{ t('kpi.assignedIps') }}</p>
            <p class="text-2xl font-semibold">{{ data?.assignedIps ?? 0 }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
