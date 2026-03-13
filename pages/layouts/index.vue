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
      <h1>Layout templates</h1>
      <NuxtLink to="/layouts/new"><button>New layout</button></NuxtLink>
    </div>

    <div v-for="layout in items || []" :key="layout.id">
      <LayoutPreview :layout="layout" />
      <div class="row" style="margin-bottom: 1rem;">
        <button class="secondary" @click="router.push(`/layouts/${layout.id}`)">Edit</button>
        <button class="danger" @click="removeLayout(layout.id)">Delete</button>
      </div>
    </div>
  </div>
</template>
