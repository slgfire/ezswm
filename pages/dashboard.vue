<script setup lang="ts">
const { t } = useI18n()
const { data: dashboard, refresh } = await useFetch('/api/dashboard')
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('dashboard.title') }}</h1>
        <p class="text-muted">{{ t('dashboard.subtitle') }}</p>
      </div>
      <UButton icon="i-lucide-refresh-cw" color="primary" @click="refresh">{{ t('common.refresh') }}</UButton>
    </div>

    <div class="grid md:grid-cols-3 gap-4">
      <UCard><p class="text-sm text-muted">{{ t('kpi.switches') }}</p><p class="text-2xl font-semibold">{{ dashboard?.switches }}</p></UCard>
      <UCard><p class="text-sm text-muted">{{ t('kpi.activeSwitches') }}</p><p class="text-2xl font-semibold">{{ dashboard?.activeSwitches }}</p></UCard>
      <UCard><p class="text-sm text-muted">{{ t('kpi.usedPorts') }}</p><p class="text-2xl font-semibold">{{ dashboard?.usedPorts }}</p></UCard>
      <UCard><p class="text-sm text-muted">{{ t('kpi.portUtilization') }}</p><UProgress :model-value="dashboard?.portUtilization || 0" /><p class="text-sm mt-2">{{ dashboard?.portUtilization }}%</p></UCard>
      <UCard><p class="text-sm text-muted">{{ t('kpi.networks') }}</p><p class="text-2xl font-semibold">{{ dashboard?.networks }}</p></UCard>
      <UCard><p class="text-sm text-muted">{{ t('kpi.assignedIps') }}</p><p class="text-2xl font-semibold">{{ dashboard?.assignedIps }}</p></UCard>
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">{{ t('dashboard.topUtilizedSubnets') }}</h2>
      </template>
      <UTable :data="dashboard?.topUtilizedSubnets || []" :columns="[
        { accessorKey: 'name', header: t('network.name') },
        { accessorKey: 'subnet', header: t('network.subnet') },
        { accessorKey: 'allocations', header: t('network.allocations') }
      ]" />
    </UCard>
  </div>
</template>
