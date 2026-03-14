<script setup lang="ts">
import type { Switch } from '~/types/models'

const { t } = useI18n()
const { data: switches, refresh } = await useFetch<Switch[]>('/api/switches')
const { data: layouts } = await useFetch('/api/layouts')

const open = ref(false)
const editing = ref<Switch | null>(null)
const form = reactive({
  name: '', vendor: '', model: '', location: '', rack: '', rackPosition: '', managementIp: '',
  serialNumber: '', status: 'active', description: '', layoutTemplateId: ''
})

const startCreate = () => {
  editing.value = null
  Object.assign(form, { name: '', vendor: '', model: '', location: '', rack: '', rackPosition: '', managementIp: '', serialNumber: '', status: 'active', description: '', layoutTemplateId: layouts.value?.[0]?.id || '' })
  open.value = true
}

const startEdit = (sw: Switch) => {
  editing.value = sw
  Object.assign(form, sw)
  open.value = true
}

const save = async () => {
  if (editing.value) await $fetch(`/api/switches/${editing.value.id}`, { method: 'PUT', body: form })
  else await $fetch('/api/switches', { method: 'POST', body: form })
  open.value = false
  await refresh()
}

const remove = async (id: string) => {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <PageHeader :title="t('pages.switches.title')" :description="t('pages.switches.description')">
      <template #actions>
        <UButton icon="i-lucide-plus" :label="t('actions.createSwitch')" @click="startCreate" />
      </template>
    </PageHeader>

    <UCard>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left">
            <th class="p-2">Name</th><th class="p-2">Model</th><th class="p-2">Management IP</th><th class="p-2">Status</th><th class="p-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="sw in switches || []" :key="sw.id" class="border-b border-default/60">
            <td class="p-2"><NuxtLink :to="`/switches/${sw.id}`" class="text-primary">{{ sw.name }}</NuxtLink></td>
            <td class="p-2">{{ sw.vendor }} {{ sw.model }}</td>
            <td class="p-2">{{ sw.managementIp }}</td>
            <td class="p-2"><UBadge :color="sw.status === 'active' ? 'success' : sw.status === 'maintenance' ? 'warning' : 'neutral'">{{ sw.status }}</UBadge></td>
            <td class="p-2 text-right space-x-2">
              <UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="startEdit(sw)" />
              <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="remove(sw.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <USlideover v-model:open="open" :title="editing ? t('actions.editSwitch') : t('actions.createSwitch')">
      <template #body>
        <div class="space-y-3">
          <UInput v-model="form.name" label="Name" />
          <UInput v-model="form.vendor" label="Vendor" />
          <UInput v-model="form.model" label="Model" />
          <UInput v-model="form.location" label="Location" />
          <div class="grid grid-cols-2 gap-2">
            <UInput v-model="form.rack" label="Rack" />
            <UInput v-model="form.rackPosition" label="Position" />
          </div>
          <UInput v-model="form.managementIp" label="Management IP" />
          <UInput v-model="form.serialNumber" label="Serial Number" />
          <USelect v-model="form.layoutTemplateId" :items="(layouts || []).map((l:any) => ({ label: l.name, value: l.id }))" label="Layout template" />
          <UTextarea v-model="form.description" label="Description" />
          <UButton block @click="save">{{ t('actions.save') }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
