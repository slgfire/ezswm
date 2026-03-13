<script setup lang="ts">
import type { LayoutTemplate } from '~/types/models'
const router = useRouter()

async function submit(payload: Partial<LayoutTemplate>) {
  await $fetch('/api/layouts', { method: 'POST', body: payload })
  router.push('/settings/port-layouts')
}
</script>

<template>
  <div>
    <h1>New layout</h1>
    <LayoutTemplateEditor @submit="submit" />
  </div>
</template>
