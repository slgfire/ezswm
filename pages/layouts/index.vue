<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'

const { data: items, refresh } = await useFetch<LayoutTemplate[]>('/api/layouts')
const router = useRouter()

async function removeLayout(id: string) {
  await $fetch(`/api/layouts/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="row row-between">
      <h1>Layout-Templates</h1>
      <NuxtLink to="/layouts/new"><button>Neues Layout</button></NuxtLink>
    </div>

    <div v-for="layout in items || []" :key="layout.id">
      <LayoutPreview :layout="layout" />
      <div class="row" style="margin-bottom: 1rem;">
        <button class="secondary" @click="router.push(`/layouts/${layout.id}`)">Bearbeiten</button>
        <button class="danger" @click="removeLayout(layout.id)">Löschen</button>
      </div>
    </div>
  </div>
</template>
