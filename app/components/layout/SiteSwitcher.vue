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

// URLs use the slug. Dropdown values follow the same convention so router.push
// in onSiteChange lands on the slug URL straight away.
function urlIdForSite(site: Site): string {
  return site.slug || site.id
}

const siteOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: t('sites.allSites'), value: 'all' }
  ]
  for (const site of sites.value) {
    options.push({ label: site.name, value: urlIdForSite(site) })
  }
  return options
})

function findSite(idOrSlug: string): Site | undefined {
  return sites.value.find(s => s.id === idOrSlug || s.slug === idOrSlug)
}

function onSiteChange(value: string) {
  const site = findSite(value)
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

  // Set current site from URL. The URL may carry either the UUID (legacy
  // bookmark) or the slug (new canonical form).
  const param = route.params.siteId as string
  if (param && param !== 'all') {
    const site = findSite(param)
    const urlId = site ? urlIdForSite(site) : param
    selectedSiteId.value = urlId
    setSite(urlId, site || undefined)
  } else if (param === 'all') {
    selectedSiteId.value = 'all'
    setSite('all', undefined)
  } else if (sites.value.length > 0) {
    // Not on a site page — default to first site
    const first = sites.value[0]!
    const urlId = urlIdForSite(first)
    selectedSiteId.value = urlId
    setSite(urlId, first)
  }
}

watch(() => route.params.siteId, (param) => {
  if (param && typeof param === 'string') {
    const site = findSite(param)
    const urlId = site ? urlIdForSite(site) : param
    selectedSiteId.value = urlId
    setSite(urlId, site || undefined)
  }
})

onMounted(() => {
  loadSites()
})
</script>
