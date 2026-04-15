import type { Site } from '~~/types/site'

export function useCurrentSite() {
  const route = useRoute()

  // Initialize from URL if available
  const initialSiteId = (route.params.siteId as string) || 'all'

  const currentSiteId = useState<string>('current-site-id', () => initialSiteId)
  const currentSite = useState<Site | null>('current-site', () => null)

  // Keep in sync with route
  if (route.params.siteId && route.params.siteId !== currentSiteId.value) {
    currentSiteId.value = route.params.siteId as string
  }

  function setSite(siteId: string, site?: Site) {
    currentSiteId.value = siteId
    currentSite.value = site || null
  }

  function isAllSites() {
    return currentSiteId.value === 'all'
  }

  function siteQuery(): Record<string, string> {
    if (currentSiteId.value === 'all') return {}
    return { site_id: currentSiteId.value }
  }

  return { currentSiteId, currentSite, setSite, isAllSites, siteQuery }
}
