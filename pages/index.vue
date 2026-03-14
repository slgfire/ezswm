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

    <div class="grid gap-4 xl:grid-cols-3">
      <UCard class="xl:col-span-2">
        <template #header>
          <h2 class="text-lg font-semibold">{{ t('dashboard.infrastructureUtilization') }}</h2>
        </template>

        <div class="space-y-6">
          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span>{{ t('kpi.usedPorts') }}</span>
              <span>{{ data?.usedPorts ?? 0 }}</span>
            </div>
            <UProgress :model-value="data?.portUtilization ?? 0" />
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span>{{ t('kpi.assignedIps') }}</span>
              <span>{{ data?.assignedIps ?? 0 }}</span>
            </div>
            <UProgress :model-value="data?.assignedIps ? Math.min(data.assignedIps, 100) : 0" />
          </div>
        </div>
      </UCard>

      <UCard>
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
    </div>
  </div>
</template>
