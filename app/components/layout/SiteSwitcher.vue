<template>
  <div class="border-b border-default px-3 py-2">
    <USelectMenu
      v-model="selectedSiteId"
      :items="siteOptions"
      value-key="value"
      :search-input="false"
      size="sm"
      class="w-full"
      @update:model-value="onSiteChange"
    />
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { currentSiteId, setSite } = useCurrentSite()

const sites = ref<any[]>([])
const selectedSiteId = ref('all')

const siteOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: t('sites.allSites'), value: 'all' }
  ]
  for (const site of sites.value) {
    options.push({ label: site.name, value: site.id })
  }
  return options
})

function onSiteChange(value: string) {
  const site = sites.value.find((s: any) => s.id === value)
  setSite(value, site)

  const sitePathMatch = route.path.match(/\/sites\/[^/]+\/(.+)/)
  const section = sitePathMatch ? sitePathMatch[1].split('/')[0] : ''

  if (section) {
    router.push(`/sites/${value}/${section}`)
  } else {
    router.push(`/sites/${value}`)
  }
}

async function loadSites() {
  try {
    const res = await $fetch<any>('/api/sites')
    sites.value = res?.data || res || []
  } catch {
    sites.value = []
  }

  // Set current site from URL
  const siteId = route.params.siteId as string
  if (siteId && siteId !== 'all') {
    selectedSiteId.value = siteId
    const site = sites.value.find((s: any) => s.id === siteId)
    setSite(siteId, site || null)
  } else if (siteId === 'all') {
    selectedSiteId.value = 'all'
    setSite('all', null)
  } else if (sites.value.length > 0) {
    // Not on a site page — default to first site
    selectedSiteId.value = sites.value[0].id
    setSite(sites.value[0].id, sites.value[0])
  }
}

// Sync when URL changes
watch(() => route.params.siteId, (siteId) => {
  if (siteId && typeof siteId === 'string') {
    selectedSiteId.value = siteId
    const site = sites.value.find((s: any) => s.id === siteId)
    setSite(siteId, site || null)
  }
})

onMounted(() => {
  loadSites()
})
</script>
