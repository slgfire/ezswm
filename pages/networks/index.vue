<script setup lang="ts">
import type { Network } from '~/types/models'

const { t } = useI18n()
const { data: networks, refresh } = await useFetch<Network[]>('/api/networks')

const open = ref(false)
const editing = ref<Network | null>(null)
const form = reactive<any>({ vlanId: 0, name: '', subnet: '', prefix: 24, gateway: '', routing: '', category: '', description: '', notes: '' })

const startCreate = () => { editing.value = null; Object.assign(form, { vlanId: 0, name: '', subnet: '', prefix: 24, gateway: '', routing: '', category: '', description: '', notes: '' }); open.value = true }
const startEdit = (network: Network) => { editing.value = network; Object.assign(form, network); open.value = true }

const save = async () => {
  if (editing.value) await $fetch(`/api/networks/${editing.value.id}`, { method: 'PUT', body: form })
  else await $fetch('/api/networks', { method: 'POST', body: form })
  open.value = false
  await refresh()
}

const remove = async (id: string) => {
  await $fetch(`/api/networks/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <PageHeader :title="t('pages.networks.title')" :description="t('pages.networks.description')">
      <template #actions><UButton icon="i-lucide-plus" :label="t('actions.createNetwork')" @click="startCreate" /></template>
    </PageHeader>

    <UCard>
      <table class="w-full text-sm">
        <thead><tr class="border-b border-default text-left"><th class="p-2">Name</th><th class="p-2">VLAN</th><th class="p-2">Subnet</th><th class="p-2">Gateway</th><th class="p-2" /></tr></thead>
        <tbody>
          <tr v-for="network in networks || []" :key="network.id" class="border-b border-default/60">
            <td class="p-2"><NuxtLink :to="`/networks/${network.id}`" class="text-primary">{{ network.name }}</NuxtLink></td>
            <td class="p-2">{{ network.vlanId }}</td>
            <td class="p-2">{{ network.subnet }}/{{ network.prefix }}</td>
            <td class="p-2">{{ network.gateway }}</td>
            <td class="p-2 text-right space-x-2">
              <UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="startEdit(network)" />
              <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="remove(network.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <USlideover v-model:open="open" :title="editing ? t('actions.editNetwork') : t('actions.createNetwork')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="form.name" label="Name" />
          <UInput v-model="form.vlanId" type="number" label="VLAN ID" />
          <UInput v-model="form.subnet" label="Subnet" />
          <UInput v-model="form.prefix" type="number" label="Prefix" />
          <UInput v-model="form.gateway" label="Gateway" />
          <UInput v-model="form.category" label="Category" />
          <UTextarea v-model="form.description" label="Description" />
          <UButton block @click="save">{{ t('actions.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
