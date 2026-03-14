<script setup lang="ts">
import type { Switch } from '~/types/models'

const query = reactive({ search: '', vendor: '', status: '', page: 1, pageSize: 10, sortBy: 'name' })
const { data: items, refresh } = await useFetch<Switch[]>('/api/switches')
const { data: meta } = await useFetch('/api/meta')

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

async function removeSwitch(id: string) {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="stack">
    <div class="row row-between">
      <h1>Switch inventory</h1>
      <UButton to="/switches/new" icon="i-lucide-plus" label="Add switch" />
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
      <SwitchTable :items="pageItems" @delete="removeSwitch" />
      <div class="row row-end mt-3">
        <UButton color="neutral" variant="soft" :disabled="query.page <= 1" label="Previous" @click="query.page--" />
        <span>Page {{ query.page }} / {{ totalPages }}</span>
        <UButton color="neutral" variant="soft" :disabled="query.page >= totalPages" label="Next" @click="query.page++" />
      </div>
    </UCard>
  </div>
</template>
