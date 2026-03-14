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

const kpis = computed(() => [
  {
    label: t('kpi.switches'),
    value: data.value?.switches ?? 0,
    icon: 'i-lucide-server',
    hint: t('dashboard.quickStatus')
  },
  {
    label: t('kpi.activeSwitches'),
    value: data.value?.activeSwitches ?? 0,
    icon: 'i-lucide-activity',
    hint: `${data.value?.activeSwitches ?? 0} / ${data.value?.switches ?? 0}`
  },
  {
    label: t('kpi.usedPorts'),
    value: data.value?.usedPorts ?? 0,
    icon: 'i-lucide-ethernet-port',
    hint: t('dashboard.infrastructureUtilization')
  },
  {
    label: t('kpi.assignedIps'),
    value: data.value?.assignedIps ?? 0,
    icon: 'i-lucide-network',
    hint: `${ipAllocationPercent.value}% ${t('dashboard.ipAllocation').toLowerCase()}`
  }
])
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.dashboard.title')"
      :description="t('pages.dashboard.description')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            label="Export"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            :loading="pending"
            label="Refresh"
            @click="handleRefresh"
          />
        </div>
      </template>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="kpi in kpis"
        :key="kpi.label"
        class="border border-default/80 bg-default/70"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-muted">{{ kpi.label }}</p>
            <p class="mt-2 text-3xl font-semibold text-highlighted">{{ kpi.value }}</p>
            <p class="mt-2 text-xs text-muted">{{ kpi.hint }}</p>
          </div>
          <span class="rounded-lg border border-default/80 bg-elevated/60 p-2 text-primary">
            <UIcon :name="kpi.icon" class="size-5" />
          </span>
        </div>
      </UCard>
    </div>

    <div class="grid gap-4 xl:grid-cols-12">
      <UCard class="xl:col-span-8 border border-default/80 bg-default/70">
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-base font-semibold">{{ t('dashboard.infrastructureUtilization') }}</h2>
            <UBadge color="primary" variant="soft">Live</UBadge>
          </div>
        </template>

        <div class="space-y-6">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>{{ t('kpi.portUtilization') }}</span>
              <span class="font-medium">{{ data?.portUtilization ?? 0 }}%</span>
            </div>
            <UProgress :model-value="data?.portUtilization ?? 0" />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span>{{ t('dashboard.ipAllocation') }}</span>
              <span class="font-medium">{{ data?.assignedIps ?? 0 }} / {{ data?.networks ?? 0 }}</span>
            </div>
            <UProgress :model-value="ipAllocationPercent" color="secondary" />
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-default/80 bg-elevated/30 p-3">
              <p class="text-xs text-muted">{{ t('dashboard.totalSwitchPorts') }}</p>
              <p class="mt-1 text-xl font-semibold">{{ data?.usedPorts ?? 0 }}</p>
            </div>
            <div class="rounded-lg border border-default/80 bg-elevated/30 p-3">
              <p class="text-xs text-muted">{{ t('kpi.networks') }}</p>
              <p class="mt-1 text-xl font-semibold">{{ data?.networks ?? 0 }}</p>
            </div>
            <div class="rounded-lg border border-default/80 bg-elevated/30 p-3">
              <p class="text-xs text-muted">{{ t('kpi.activeSwitches') }}</p>
              <p class="mt-1 text-xl font-semibold">{{ data?.activeSwitches ?? 0 }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="xl:col-span-4 border border-default/80 bg-default/70">
        <template #header>
          <h2 class="text-base font-semibold">{{ t('dashboard.quickStatus') }}</h2>
        </template>

        <ul class="space-y-3 text-sm">
          <li class="flex items-center justify-between rounded-lg border border-default/80 bg-elevated/30 px-3 py-2">
            <span>{{ t('kpi.activeSwitches') }}</span>
            <UBadge color="success" variant="subtle">{{ data?.activeSwitches ?? 0 }}</UBadge>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default/80 bg-elevated/30 px-3 py-2">
            <span>{{ t('kpi.portUtilization') }}</span>
            <span class="font-semibold">{{ data?.portUtilization ?? 0 }}%</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default/80 bg-elevated/30 px-3 py-2">
            <span>{{ t('kpi.assignedIps') }}</span>
            <span class="font-semibold">{{ data?.assignedIps ?? 0 }}</span>
          </li>
          <li class="flex items-center justify-between rounded-lg border border-default/80 bg-elevated/30 px-3 py-2">
            <span>{{ t('dashboard.availableNetworks') }}</span>
            <span class="font-semibold">{{ data?.networks ?? 0 }}</span>
          </li>
        </ul>
      </UCard>
    </div>

    <UCard class="border border-default/80 bg-default/70">
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-base font-semibold">{{ t('dashboard.topSubnets') }}</h2>
          <UBadge color="neutral" variant="subtle">Top 5</UBadge>
        </div>
      </template>

      <div class="space-y-4">
        <div
          v-for="entry in data?.subnetUsage || []"
          :key="entry.networkId"
          class="rounded-lg border border-default/80 bg-elevated/20 p-3"
        >
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium">{{ entry.name }}</span>
            <span>{{ entry.used }} / {{ entry.capacity }}</span>
          </div>
          <UProgress :model-value="entry.percent" />
        </div>
      </div>
    </UCard>
  </div>
</template>
