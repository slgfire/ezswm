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
  <div class="stack">
    <UCard>
      <div class="row row-between">
        <div>
          <h1>Layout templates</h1>
          <small>Define classic grids and advanced block-based front panels.</small>
        </div>
        <UButton to="/settings/port-layouts/new" icon="i-lucide-plus" label="New layout" />
      </div>
    </UCard>

    <UCard v-for="layout in items || []" :key="layout.id" class="stack">
      <LayoutPreview :layout="layout" />
      <div class="row row-end">
        <UButton color="neutral" variant="soft" label="Edit" @click="router.push(`/settings/port-layouts/${layout.id}`)" />
        <UButton color="error" variant="soft" label="Delete" @click="removeLayout(layout.id)" />
      </div>
    </UCard>
  </div>
</template>
