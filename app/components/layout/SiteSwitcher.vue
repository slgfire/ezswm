<template>
  <div class="px-3 pb-3">
    <USelectMenu
      v-model="selectedSiteId"
      :items="siteOptions"
      value-key="value"
      :search-input="false"
      size="sm"
      class="w-full"
      @update:model-value="onSiteChange"
    >
      <template #leading>
        <UIcon name="i-heroicons-building-office-2" class="h-4 w-4 text-primary-500" />
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { items: sites, fetch: fetchSites } = useSites()
const { currentSiteId, setSite } = useCurrentSite()

const selectedSiteId = ref(currentSiteId.value)

const siteOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: 'All Sites', value: 'all' }
  ]
  for (const site of sites.value) {
    options.push({ label: site.name, value: site.id })
  }
  return options
})

function onSiteChange(value: string) {
  const site = sites.value.find((s: any) => s.id === value)
  setSite(value, site)

  // Navigate to the same section but under new site context
  const currentPath = route.path

  // Extract the section from current path (switches, vlans, networks, etc.)
  const sitePathMatch = currentPath.match(/\/sites\/[^/]+\/(.+)/)
  const section = sitePathMatch ? sitePathMatch[1] : 'switches'

  if (value === 'all') {
    router.push(`/sites/all/${section}`)
  } else {
    router.push(`/sites/${value}/${section}`)
  }
}

// Sync site from URL on mount and route change
watch(() => route.params.siteId, (siteId) => {
  if (siteId && typeof siteId === 'string') {
    selectedSiteId.value = siteId
    const site = sites.value.find((s: any) => s.id === siteId)
    setSite(siteId, site || null)
  }
}, { immediate: true })

onMounted(() => {
  fetchSites()
})
</script>
