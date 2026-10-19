<template>
  <div class="border-b border-default px-3 py-2">
    <USelectMenu
      v-model="selectedSiteId"
      :items="siteOptions"
      value-key="value"
      :aria-label="$t('sites.switchSite')"
      :search-input="false"
      size="sm"
      class="w-full"
      @update:model-value="onSiteChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { Site } from '~~/types/site'
import { resolveStartSite } from '../../utils/startSite'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { user } = useAuth()
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

function applyStartSiteFallback() {
  const site = resolveStartSite(sites.value, user.value?.start_site_id)
  if (!site) {
    selectedSiteId.value = 'all'
    setSite('all', undefined)
    return
  }

  const urlId = urlIdForSite(site)
  selectedSiteId.value = urlId
  setSite(urlId, site)
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
  } else applyStartSiteFallback()
}

watch(() => route.params.siteId, (param) => {
  if (param && typeof param === 'string') {
    const site = findSite(param)
    const urlId = site ? urlIdForSite(site) : param
    selectedSiteId.value = urlId
    setSite(urlId, site || undefined)
  } else applyStartSiteFallback()
})

watch(() => user.value?.start_site_id, () => {
  if (!route.params.siteId) applyStartSiteFallback()
})

onMounted(() => {
  loadSites()
})
</script>
