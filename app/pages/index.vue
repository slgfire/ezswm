<template>
  <div class="flex h-full items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
import type { Site } from '~~/types/site'
import { getLastVisitedSiteId, resolveStartSite } from '../utils/startSite'

definePageMeta({ layout: false })
const { user } = useAuth()

onMounted(async () => {
  try {
    const res = await $fetch<{ data?: Site[] } | Site[]>('/api/sites')
    const sites = ('data' in res && Array.isArray(res.data)) ? res.data : Array.isArray(res) ? res : []
    const site = resolveStartSite(
      sites,
      user.value?.start_site_id,
      getLastVisitedSiteId(user.value?.id)
    )
    if (site) {
      await navigateTo(`/sites/${site.slug || site.id}`, { replace: true })
    } else {
      await navigateTo('/sites', { replace: true })
    }
  } catch {
    await navigateTo('/login', { replace: true })
  }
})
</script>
