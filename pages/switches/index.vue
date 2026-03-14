<script setup lang="ts">
import type { NetworkSwitch } from '~/types/domain'

const { t } = useI18n()
const { data: switches, refresh } = await useSwitches()
const { data: layouts } = await useLayouts()

const open = ref(false)
const editing = ref<NetworkSwitch | null>(null)

const defaultForm = () => ({
  id: '', name: '', vendor: '', model: '', location: '', rack: '', rackPosition: '', managementIp: '',
  serialNumber: '', status: 'active', description: '', layoutTemplateId: layouts.value?.[0]?.id || '', ports: []
})

const form = ref<any>(defaultForm())

const openCreate = () => {
  editing.value = null
  form.value = defaultForm()
  open.value = true
}

const openEdit = (item: NetworkSwitch) => {
  editing.value = item
  form.value = structuredClone(item)
  open.value = true
}

const save = async () => {
  if (editing.value) {
    await $fetch(`/api/switches/${editing.value.id}`, { method: 'PUT', body: form.value })
  } else {
    await $fetch('/api/switches', { method: 'POST', body: { ...form.value, id: `sw-${crypto.randomUUID()}`, ports: [] } })
  }
  open.value = false
  await refresh()
}

const remove = async (id: string) => {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">{{ t('switches.title') }}</h2>
      <UButton color="green" @click="openCreate">{{ t('common.create') }}</UButton>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <UCard v-for="item in switches || []" :key="item.id">
        <div class="flex items-start justify-between">
          <div>
            <NuxtLink :to="`/switches/${item.id}`" class="text-lg font-semibold text-green-600">{{ item.name }}</NuxtLink>
            <p class="text-sm text-gray-500">{{ item.vendor }} {{ item.model }}</p>
            <p class="text-sm text-gray-500">{{ item.location }} / {{ item.rack }} {{ item.rackPosition }}</p>
          </div>
          <UBadge :color="item.status === 'active' ? 'green' : 'gray'" variant="subtle">{{ item.status }}</UBadge>
        </div>
        <template #footer>
          <div class="flex gap-2">
            <UButton size="sm" variant="soft" @click="openEdit(item)">{{ t('common.edit') }}</UButton>
            <UButton size="sm" color="red" variant="soft" @click="remove(item.id)">{{ t('common.delete') }}</UButton>
          </div>
        </template>
      </UCard>
    </div>

    <USlideover v-model="open">
      <UCard>
        <template #header>{{ editing ? t('switches.editSwitch') : t('switches.createSwitch') }}</template>
        <div class="grid gap-3">
          <UInput v-model="form.name" :placeholder="t('switches.fields.name')" />
          <UInput v-model="form.vendor" :placeholder="t('switches.fields.vendor')" />
          <UInput v-model="form.model" :placeholder="t('switches.fields.model')" />
          <UInput v-model="form.managementIp" :placeholder="t('switches.fields.managementIp')" />
          <USelectMenu v-model="form.layoutTemplateId" :options="(layouts || []).map(l => ({ label: l.name, value: l.id }))" value-attribute="value" option-attribute="label" />
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
