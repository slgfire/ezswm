<template>
  <div class="space-y-4">
    <div class="flex justify-between"><h2 class="text-xl font-semibold">{{ t('switch.title') }}</h2><UButton @click="open=true">{{ t('switch.new') }}</UButton></div>
    <UCard>
      <UTable :rows="switches || []" :columns="columns">
        <template #name-data="{ row }"><NuxtLink :to="`/switches/${row.id}`" class="text-primary-600">{{ row.name }}</NuxtLink></template>
      </UTable>
    </UCard>
    <SwitchFormSlideover v-model="open" title="Create switch" @saved="createSwitch" />
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n()
const open = ref(false)
const columns = [{ key: 'name', label: 'Name' }, { key: 'vendor', label: 'Vendor' }, { key: 'model', label: 'Model' }, { key: 'status', label: 'Status' }]
const { data: switches, refresh } = await useFetch('/api/switches')
const createSwitch = async (payload: any) => {
  await $fetch('/api/switches', { method: 'POST', body: payload }); open.value = false; refresh()
}
</script>
