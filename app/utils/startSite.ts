import type { Site } from '~~/types/site'

export function resolveStartSite<T extends Pick<Site, 'id' | 'name'>>(
  sites: readonly T[],
  preferredSiteId?: string | null
): T | undefined {
  return sites.find(site => site.id === preferredSiteId) ?? sites[0]
}
