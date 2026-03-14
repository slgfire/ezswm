<script setup lang="ts">
const { t } = useI18n()
const { data: layouts, refresh } = await useLayouts()
const open = ref(false)
const form = ref<any>({ id: '', name: '', description: '', blocks: [{ id: 'block-1', name: 'Ports', type: 'sfp', rows: 2, columns: 12, startPort: 1, endPort: 24, order: 1 }] })

const create = async () => {
  await $fetch('/api/layouts', { method: 'POST', body: { ...form.value, id: `layout-${crypto.randomUUID()}` } })
  open.value = false
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">{{ t('settings.title') }}</h2>
      <UButton color="green" @click="open = true">{{ t('settings.createLayout') }}</UButton>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <UCard v-for="layout in layouts || []" :key="layout.id">
        <h3 class="font-semibold">{{ layout.name }}</h3>
        <p class="text-sm text-gray-500">{{ layout.blocks.length }} blocks</p>
      </UCard>
    </div>

    <USlideover v-model="open">
      <UCard>
        <template #header>{{ t('settings.createLayout') }}</template>
        <div class="grid gap-3">
          <UInput v-model="form.name" :placeholder="t('settings.fields.name')" />
          <UTextarea v-model="form.description" :placeholder="t('settings.fields.description')" />
        </div>
        <template #footer><UButton color="green" @click="create">{{ t('common.save') }}</UButton></template>
      </UCard>
    </USlideover>
  </div>
</template>
