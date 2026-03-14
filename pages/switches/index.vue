<script setup lang="ts">
import type { Switch, SwitchStatus } from '~/types/models'

const query = reactive({ search: '', vendor: '', status: '', page: 1, pageSize: 10, sortBy: 'name' })
const { data: items, refresh } = await useFetch<Switch[]>('/api/switches')
const { data: meta } = await useFetch('/api/meta')

const isFormOpen = ref(false)
const editingSwitchId = ref<string | null>(null)
const form = reactive({
  name: '',
  vendor: '',
  model: '',
  managementIp: '',
  portCount: 24,
  status: 'planned' as SwitchStatus,
  serialNumber: '',
  rackPosition: '',
  description: '',
  tags: '',
  layoutTemplateId: '',
  locationName: '',
  rackName: ''
})

const filtered = computed(() => {
  const base = (items.value || []).filter((s) => {
    const text = `${s.name} ${s.model} ${s.managementIp}`.toLowerCase()
    return (!query.search || text.includes(query.search.toLowerCase()))
      && (!query.vendor || s.vendor === query.vendor)
      && (!query.status || s.status === query.status)
  })

  base.sort((a, b) => `${(a as any)[query.sortBy] || ''}`.localeCompare(`${(b as any)[query.sortBy] || ''}`))
  return base
})

const pageItems = computed(() => {
  const start = (query.page - 1) * query.pageSize
  return filtered.value.slice(start, start + query.pageSize)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / query.pageSize)))

watch([() => query.search, () => query.vendor, () => query.status], () => {
  query.page = 1
})

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ')

function resetForm() {
  editingSwitchId.value = null
  Object.assign(form, {
    name: '', vendor: '', model: '', managementIp: '', portCount: 24, status: 'planned', serialNumber: '', rackPosition: '', description: '', tags: '', layoutTemplateId: '', locationName: '', rackName: ''
  })
}

function beginCreate() {
  resetForm()
  isFormOpen.value = true
}

function beginEdit(sw: Switch) {
  editingSwitchId.value = sw.id
  const locations = (meta.value as any)?.locations || []
  const racks = (meta.value as any)?.racks || []
  const location = locations.find((entry: any) => entry.id === sw.locationId)
  const rack = racks.find((entry: any) => entry.id === sw.rackId)

  Object.assign(form, {
    name: sw.name,
    vendor: sw.vendor,
    model: sw.model,
    managementIp: sw.managementIp,
    portCount: sw.portCount,
    status: sw.status,
    serialNumber: sw.serialNumber || '',
    rackPosition: sw.rackPosition || '',
    description: sw.description || '',
    tags: (sw.tags || []).join(', '),
    layoutTemplateId: sw.layoutTemplateId || '',
    locationName: location?.name || '',
    rackName: rack?.name || ''
  })

  isFormOpen.value = true
}

async function saveSwitch() {
  const payload = {
    ...form,
    portCount: Number(form.portCount),
    locationName: normalized(form.locationName),
    rackName: normalized(form.rackName),
    tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  }

  if (editingSwitchId.value) {
    await $fetch(`/api/switches/${editingSwitchId.value}`, { method: 'PUT', body: payload })
  } else {
    await $fetch('/api/switches', { method: 'POST', body: payload })
  }

  isFormOpen.value = false
  resetForm()
  await refresh()
}

async function removeSwitch(id: string) {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="stack">
    <div class="row row-between">
      <h1>Switch inventory</h1>
      <UButton icon="i-lucide-plus" label="Add switch" @click="beginCreate" />
    </div>

    <UCard>
      <div class="row">
        <UInput v-model="query.search" icon="i-lucide-search" placeholder="Search by name, model, or management IP" class="flex-1 min-w-[250px]" />
        <USelect v-model="query.vendor" :items="[{ label: 'All vendors', value: '' }, ...((meta as any)?.vendors || []).map((v:any)=>({label:v.name,value:v.name}))]" class="min-w-40" />
        <USelect v-model="query.status" :items="[{label:'All status',value:''},{label:'active',value:'active'},{label:'planned',value:'planned'},{label:'retired',value:'retired'}]" class="min-w-40" />
        <USelect v-model="query.sortBy" :items="[{label:'Name',value:'name'},{label:'Vendor',value:'vendor'},{label:'Model',value:'model'},{label:'Status',value:'status'}]" class="min-w-36" />
      </div>
    </UCard>

    <UCard>
      <SwitchTable :items="pageItems" @delete="removeSwitch" @edit="beginEdit" />
      <div class="row row-end mt-3">
        <UButton color="neutral" variant="soft" :disabled="query.page <= 1" label="Previous" @click="query.page--" />
        <span>Page {{ query.page }} / {{ totalPages }}</span>
        <UButton color="neutral" variant="soft" :disabled="query.page >= totalPages" label="Next" @click="query.page++" />
      </div>
    </UCard>

    <FormDrawer
      :open="isFormOpen"
      :title="editingSwitchId ? 'Edit switch' : 'Add switch'"
      description="Create or edit switch metadata without leaving the inventory."
      @close="isFormOpen = false"
    >
      <UForm :state="form" class="stack" @submit.prevent="saveSwitch">
        <div class="network-form-grid">
          <UInput v-model="form.name" required placeholder="Name" />
          <UInput v-model="form.vendor" required placeholder="Vendor" />
          <UInput v-model="form.model" required placeholder="Model" />
          <UInput v-model="form.managementIp" required placeholder="Management IP" />
          <UInput v-model="form.locationName" placeholder="Location" />
          <UInput v-model="form.rackName" placeholder="Rack" />
          <UInput v-model="form.rackPosition" placeholder="Rack position" />
          <UInput v-model="form.serialNumber" placeholder="Serial number" />
          <UInput v-model="form.tags" placeholder="Tags (csv)" />
          <USelect v-model="form.status" :items="['active', 'planned', 'retired']" />
          <USelect v-model="form.layoutTemplateId" :items="[{ label: 'No layout', value: '' }, ...((meta as any)?.layoutTemplates || []).map((layout:any) => ({ label: layout.name, value: layout.id }))]" />
          <UInput v-model="form.portCount" type="number" min="1" placeholder="Port count" />
        </div>
        <UTextarea v-model="form.description" :rows="3" placeholder="Description" />
        <div class="row row-end">
          <UButton type="button" color="neutral" variant="soft" label="Cancel" @click="isFormOpen = false" />
          <UButton type="submit" :label="editingSwitchId ? 'Save switch' : 'Create switch'" />
        </div>
      </UForm>
    </FormDrawer>
  </div>
</template>
