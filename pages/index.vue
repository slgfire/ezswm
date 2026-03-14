<script setup lang="ts">
const { t } = useI18n()
const { data: metrics } = await useDashboard()
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">{{ t('dashboard.title') }}</h2>

    <div class="grid gap-4 md:grid-cols-3">
      <UCard v-for="item in [
        { label: t('dashboard.kpis.switches'), value: metrics?.switches },
        { label: t('dashboard.kpis.activeSwitches'), value: metrics?.activeSwitches },
        { label: t('dashboard.kpis.usedPorts'), value: metrics?.usedPorts },
        { label: t('dashboard.kpis.networks'), value: metrics?.networks },
        { label: t('dashboard.kpis.assignedIps'), value: metrics?.assignedIps },
        { label: t('dashboard.kpis.portUtilization'), value: `${metrics?.portUtilization || 0}%` }
      ]" :key="item.label">
        <p class="text-sm text-gray-500">{{ item.label }}</p>
        <p class="text-2xl font-semibold">{{ item.value ?? 0 }}</p>
      </UCard>
    </div>

    <UCard>
      <template #header>{{ t('dashboard.infrastructureUtilization') }}</template>
      <UProgress :value="metrics?.infrastructureUtilization || 0" color="green" />
      <p class="mt-2 text-sm text-gray-500">{{ metrics?.infrastructureUtilization || 0 }}%</p>
    </UCard>

    <UCard>
      <template #header>{{ t('dashboard.topSubnets') }}</template>
      <div class="space-y-2">
        <div v-for="subnet in metrics?.topSubnets || []" :key="subnet.name" class="flex items-center justify-between rounded border p-2 dark:border-gray-800">
          <span>{{ subnet.name }}</span>
          <UBadge color="green" variant="subtle">{{ subnet.utilization }}</UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
