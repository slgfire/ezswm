<template>
  <div class="space-y-4">
    <div class="flex justify-between"><h2 class="text-xl font-semibold">{{ t('settings.title') }}</h2><UButton @click="open=true">{{ t('settings.newLayout') }}</UButton></div>
    <UCard><UTable :rows="layouts || []" :columns="cols" /></UCard>
    <LayoutFormSlideover v-model="open" @saved="createLayout" />
  </div>
</template>
<script setup lang="ts">
const { t } = useI18n()
const open = ref(false)
const cols = [{ key: 'name', label: 'Name' }, { key: 'vendor', label: 'Vendor' }, { key: 'model', label: 'Model' }]
const { data: layouts, refresh } = await useFetch('/api/layouts')
const createLayout = async (payload: any) => { await $fetch('/api/layouts', { method: 'POST', body: payload }); open.value = false; refresh() }
</script>
