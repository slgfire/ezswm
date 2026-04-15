<template>
  <div class="flex h-full items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

onMounted(async () => {
  try {
    const res = await $fetch<{ data?: { id: string }[] } | { id: string }[]>('/api/sites')
    const sites = ('data' in res && Array.isArray(res.data)) ? res.data : Array.isArray(res) ? res : []
    if (sites.length > 0) {
      await navigateTo(`/sites/${sites[0]!.id}`, { replace: true })
    } else {
      await navigateTo('/sites', { replace: true })
    }
  } catch {
    await navigateTo('/login', { replace: true })
  }
})
</script>
