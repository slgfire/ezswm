<script setup lang="ts">
import type { Network } from '~/types/models'

const { t } = useI18n()
const open = ref(false)
const editing = ref<Network | null>(null)

const initialForm = {
  vlanId: 0,
  name: '',
  subnet: '',
  prefix: 24,
  gateway: '',
  routing: 'static',
  category: '',
  description: '',
  notes: ''
}
const form = ref({ ...initialForm })

const { data: networks, refresh } = await useFetch<Network[]>('/api/networks')

function createNetwork() {
  editing.value = null
  form.value = { ...initialForm }
  open.value = true
}

function editNetwork(network: Network) {
  editing.value = network
  form.value = { ...network }
  open.value = true
}

async function save() {
  if (editing.value) {
    await $fetch(`/api/networks/${editing.value.id}`, { method: 'PUT', body: form.value })
  } else {
    await $fetch('/api/networks', { method: 'POST', body: form.value })
  }
  open.value = false
  await refresh()
}

async function remove(id: string) {
  await $fetch(`/api/networks/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-semibold">{{ t('network.titlePlural') }}</h1>
      <UButton icon="i-lucide-plus" @click="createNetwork">{{ t('common.create') }}</UButton>
    </div>

    <UCard>
      <UTable :data="networks || []" :columns="[
        { accessorKey: 'vlanId', header: t('network.vlanId') },
        { accessorKey: 'name', header: t('network.name') },
        { accessorKey: 'subnet', header: t('network.subnet') },
        { accessorKey: 'gateway', header: t('network.gateway') }
      ]">
        <template #expanded="{ row }">
          <div class="flex gap-2 p-2">
            <UButton size="sm" @click="navigateTo(`/networks/${row.original.id}`)">{{ t('common.open') }}</UButton>
            <UButton size="sm" color="neutral" variant="soft" @click="editNetwork(row.original)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="error" variant="soft" @click="remove(row.original.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <USlideover v-model:open="open" :title="editing ? t('network.edit') : t('network.create')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="form.vlanId" type="number" :label="t('network.vlanId')" />
          <UInput v-model="form.name" :label="t('network.name')" />
          <UInput v-model="form.subnet" :label="t('network.subnetOnly')" />
          <UInput v-model="form.prefix" type="number" :label="t('network.prefix')" />
          <UInput v-model="form.gateway" :label="t('network.gateway')" />
          <USelect v-model="form.routing" :items="['static','dynamic']" :label="t('network.routing')" />
          <UInput v-model="form.category" :label="t('network.category')" />
          <UTextarea v-model="form.description" :label="t('common.description')" />
          <UButton block @click="save">{{ t('common.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
