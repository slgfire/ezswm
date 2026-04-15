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
import type { Site } from '~~/types/site'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { setSite } = useCurrentSite()

const sites = ref<Site[]>([])
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
  const site = sites.value.find((s) => s.id === value)
  setSite(value, site)

  const sitePathMatch = route.path.match(/\/sites\/[^/]+\/(.+)/)
  const section = sitePathMatch ? sitePathMatch[1]!.split('/')[0] : ''

  if (section) {
    router.push(`/sites/${value}/${section}`)
  } else {
    router.push(`/sites/${value}`)
  }
}

async function loadSites() {
  try {
    const res = await $fetch<{ data?: Site[] } | Site[]>('/api/sites')
    sites.value = (Array.isArray(res) ? res : res?.data) || []
  } catch {
    sites.value = []
  }

  // Set current site from URL
  const siteId = route.params.siteId as string
  if (siteId && siteId !== 'all') {
    selectedSiteId.value = siteId
    const site = sites.value.find((s) => s.id === siteId)
    setSite(siteId, site || undefined)
  } else if (siteId === 'all') {
    selectedSiteId.value = 'all'
    setSite('all', undefined)
  } else if (sites.value.length > 0) {
    // Not on a site page — default to first site
    selectedSiteId.value = sites.value[0]!.id
    setSite(sites.value[0]!.id, sites.value[0]!)
  }
}

// Sync when URL changes
watch(() => route.params.siteId, (siteId) => {
  if (siteId && typeof siteId === 'string') {
    selectedSiteId.value = siteId
    const site = sites.value.find((s) => s.id === siteId)
    setSite(siteId, site || undefined)
  }
})

onMounted(() => {
  loadSites()
})
</script>
