<template>
  <div class="space-y-4">
    <div class="flex justify-between"><h2 class="text-xl font-semibold">{{ t('network.title') }}</h2><UButton @click="open=true">{{ t('network.new') }}</UButton></div>
    <UCard>
      <UTable :rows="networks || []" :columns="columns">
        <template #name-data="{ row }"><NuxtLink :to="`/networks/${row.id}`" class="text-primary-600">{{ row.name }}</NuxtLink></template>
      </UTable>
    </UCard>
    <NetworkFormSlideover v-model="open" title="Create network" @saved="createNetwork" />
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n()
const open = ref(false)
const columns = [{ key: 'vlanId', label: 'VLAN' }, { key: 'name', label: 'Name' }, { key: 'subnet', label: 'Subnet' }, { key: 'prefix', label: 'Prefix' }]
const { data: networks, refresh } = await useFetch('/api/networks')
const createNetwork = async (payload: any) => { await $fetch('/api/networks', { method: 'POST', body: payload }); open.value = false; refresh() }
</script>
