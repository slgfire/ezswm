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

async function removeSwitch(id: string) {
  await $fetch(`/api/switches/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="stack">
    <div class="row row-between">
      <h1>Switch inventory</h1>
      <NuxtLink to="/switches/new"><button>Add switch</button></NuxtLink>
    </div>

    <div class="panel row">
      <input v-model="query.search" placeholder="Search by name, model, or management IP">
      <select v-model="query.vendor">
        <option value="">All vendors</option>
        <option v-for="v in (meta as any)?.vendors || []" :key="v.id" :value="v.name">{{ v.name }}</option>
      </select>
      <select v-model="query.status">
        <option value="">All status</option>
        <option value="active">active</option>
        <option value="planned">planned</option>
        <option value="retired">retired</option>
      </select>
      <select v-model="query.sortBy">
        <option value="name">Name</option>
        <option value="vendor">Vendor</option>
        <option value="model">Model</option>
        <option value="status">Status</option>
      </select>
    </div>

    <div class="panel">
      <SwitchTable :items="pageItems" @delete="removeSwitch" />
      <div class="row row-end" style="margin-top: .75rem;">
        <button class="secondary" :disabled="query.page <= 1" @click="query.page--">Previous</button>
        <span>Page {{ query.page }} / {{ totalPages }}</span>
        <button class="secondary" :disabled="query.page >= totalPages" @click="query.page++">Next</button>
      </div>
    </div>
  </div>
</template>
