<script setup lang="ts">
import { prefixToNetmask } from '~/utils/ip'

const { t } = useI18n()
const { data: networks, refresh } = await useNetworks()
const open = ref(false)
const editing = ref<any>(null)
const form = ref<any>({ vlanId: 1, name: '', subnet: '10.10.0.0', prefix: 24, gateway: '', routing: true, category: 'user', description: '', notes: '' })

const save = async () => {
  const payload = { ...form.value, netmask: prefixToNetmask(Number(form.value.prefix)), id: editing.value?.id || `net-${crypto.randomUUID()}`, allocations: editing.value?.allocations || [], ranges: editing.value?.ranges || [] }
  if (editing.value) await $fetch(`/api/networks/${editing.value.id}`, { method: 'PUT', body: payload })
  else await $fetch('/api/networks', { method: 'POST', body: payload })
  open.value = false
  await refresh()
}

const edit = (item: any) => {
  editing.value = item
  form.value = structuredClone(item)
  open.value = true
}

const create = () => {
  editing.value = null
  form.value = { vlanId: 1, name: '', subnet: '10.10.0.0', prefix: 24, gateway: '', routing: true, category: 'user', description: '', notes: '' }
  open.value = true
}

const remove = async (id: string) => {
  await $fetch(`/api/networks/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">{{ t('networks.title') }}</h2>
      <UButton color="green" @click="create">{{ t('common.create') }}</UButton>
    </div>

    <UCard>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500">
            <th class="py-2">VLAN</th><th>Name</th><th>Subnet</th><th>Gateway</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in networks || []" :key="item.id" class="border-t dark:border-gray-800">
            <td class="py-2">{{ item.vlanId }}</td>
            <td><NuxtLink :to="`/networks/${item.id}`" class="text-green-600">{{ item.name }}</NuxtLink></td>
            <td>{{ item.subnet }}/{{ item.prefix }}</td>
            <td>{{ item.gateway }}</td>
            <td class="space-x-2 text-right">
              <UButton size="xs" variant="soft" @click="edit(item)">{{ t('common.edit') }}</UButton>
              <UButton size="xs" color="red" variant="soft" @click="remove(item.id)">{{ t('common.delete') }}</UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <USlideover v-model="open">
      <UCard>
        <template #header>{{ editing ? t('networks.editNetwork') : t('networks.createNetwork') }}</template>
        <div class="grid gap-3">
          <UInput v-model.number="form.vlanId" :placeholder="t('networks.fields.vlanId')" />
          <UInput v-model="form.name" :placeholder="t('networks.fields.name')" />
          <UInput v-model="form.subnet" :placeholder="t('networks.fields.subnet')" />
          <UInput v-model.number="form.prefix" :placeholder="t('networks.fields.prefix')" />
          <UInput v-model="form.gateway" :placeholder="t('networks.fields.gateway')" />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</UButton>
            <UButton color="green" @click="save">{{ t('common.save') }}</UButton>
          </div>
        </template>
      </UCard>
    </USlideover>
  </div>
</template>
