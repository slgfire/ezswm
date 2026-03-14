<template>
  <div class="space-y-4">
    <KpiCards :cards="cards" />
    <UCard>
      <template #header>{{ t('dashboard.infra') }}</template>
      <UProgress :value="dashboard?.infrastructureUtilization || 0" />
    </UCard>
    <UCard>
      <template #header>{{ t('dashboard.topSubnets') }}</template>
      <div class="space-y-2">
        <div v-for="subnet in dashboard?.topUtilizedSubnets || []" :key="subnet.name" class="flex items-center justify-between">
          <span>{{ subnet.name }}</span><UBadge>{{ subnet.utilization }}</UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n()
const { data: dashboard } = await useFetch('/api/dashboard')
const cards = computed(() => [
  { label: t('dashboard.kpi.switches'), value: dashboard.value?.switches || 0 },
  { label: t('dashboard.kpi.activeSwitches'), value: dashboard.value?.activeSwitches || 0 },
  { label: t('dashboard.kpi.usedPorts'), value: dashboard.value?.usedPorts || 0 },
  { label: t('dashboard.kpi.portUtilization'), value: `${dashboard.value?.portUtilization || 0}%` },
  { label: t('dashboard.kpi.networks'), value: dashboard.value?.networks || 0 },
  { label: t('dashboard.kpi.assignedIps'), value: dashboard.value?.assignedIps || 0 }
])
</script>
