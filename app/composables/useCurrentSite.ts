export function useCurrentSite() {
  const currentSiteId = useState<string>('current-site-id', () => 'all')
  const currentSite = useState<any>('current-site', () => null)

  function setSite(siteId: string, site?: any) {
    currentSiteId.value = siteId
    currentSite.value = site || null
  }

  function isAllSites() {
    return currentSiteId.value === 'all'
  }

  // Helper to get the site_id query param for API calls
  function siteQuery(): Record<string, string> {
    if (currentSiteId.value === 'all') return {}
    return { site_id: currentSiteId.value }
  }

  return { currentSiteId, currentSite, setSite, isAllSites, siteQuery }
}
