<script setup lang="ts">
import type { LayoutTemplate, Switch } from '~/types/models'

const { t } = useI18n()
const open = ref(false)
const editing = ref<Switch | null>(null)

const emptySwitch: Omit<Switch, 'id'> = {
  name: '', vendor: '', model: '', location: '', rack: '', rackPosition: '', managementIp: '', serialNumber: '', status: 'active', description: '', layoutTemplateId: '', tags: [], ports: []
}
const form = ref(structuredClone(emptySwitch))

const { data: switches, refresh } = await useFetch<Switch[]>('/api/switches')
const { data: layouts } = await useFetch<LayoutTemplate[]>('/api/layout-templates')

function openCreate() {
  editing.value = null
  form.value = structuredClone(emptySwitch)
  open.value = true
}

function openEdit(item: Switch) {
  editing.value = item
  form.value = { ...item }
  open.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/switches/${editing.value.id}`, { method: 'PUT', body: form.value })
  } else {
    await $fetch('/api/switches', { method: 'POST', body: form.value })
  }
  open.value = false
  await refresh()
}

async function remove(id: string) {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('switch.titlePlural') }}</h1>
      </div>
      <UButton icon="i-lucide-plus" @click="openCreate">{{ t('common.create') }}</UButton>
    </div>

    <UCard>
      <UTable :data="switches || []" :columns="[
        { accessorKey: 'name', header: t('switch.name') },
        { accessorKey: 'model', header: t('switch.model') },
        { accessorKey: 'managementIp', header: t('switch.managementIp') },
        { accessorKey: 'status', header: t('common.status') }
      ]">
        <template #expanded="{ row }">
          <div class="flex gap-2 p-2">
            <UButton size="sm" @click="navigateTo(`/switches/${row.original.id}`)">{{ t('common.open') }}</UButton>
            <UButton size="sm" color="neutral" variant="soft" @click="openEdit(row.original)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="error" variant="soft" @click="remove(row.original.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <USlideover v-model:open="open" :title="editing ? t('switch.edit') : t('switch.create')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="form.name" :label="t('switch.name')" />
          <UInput v-model="form.vendor" :label="t('switch.vendor')" />
          <UInput v-model="form.model" :label="t('switch.model')" />
          <UInput v-model="form.location" :label="t('switch.location')" />
          <UInput v-model="form.rack" :label="t('switch.rack')" />
          <UInput v-model="form.rackPosition" :label="t('switch.rackPosition')" />
          <UInput v-model="form.managementIp" :label="t('switch.managementIp')" />
          <UInput v-model="form.serialNumber" :label="t('switch.serialNumber')" />
          <USelect v-model="form.layoutTemplateId" :items="(layouts || []).map((item) => ({ label: item.name, value: item.id }))" :label="t('switch.layoutTemplate')" />
          <UTextarea v-model="form.description" :label="t('common.description')" />
          <UButton block @click="save">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
