<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'

const route = useRoute()
const router = useRouter()
const { data: item } = await useFetch<LayoutTemplate[]>('/api/layouts')

const current = computed(() => item.value?.find((x) => x.id === route.params.id))

async function submit(payload: Partial<LayoutTemplate>) {
  await $fetch(`/api/layouts/${route.params.id}`, { method: 'PUT', body: payload })
  router.push('/settings/port-layouts')
}
</script>

<template>
  <div>
    <h1>Edit layout</h1>
    <LayoutTemplateEditor v-if="current" :initial="current" @submit="submit" />
  </div>
</template>
