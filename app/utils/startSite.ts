import type { Site } from '~~/types/site'

type StartSiteStorage = Pick<Storage, 'getItem' | 'setItem'>

const LAST_VISITED_SITE_PREFIX = 'ezswm:last-visited-site:'

function browserStorage(): StartSiteStorage | undefined {
  if (typeof window === 'undefined') return

  try {
    return window.localStorage
  } catch {
    return
  }
}

export function getLastVisitedSiteId(userId: string | undefined, storage = browserStorage()): string | null {
  if (!userId || !storage) return null

  try {
    return storage.getItem(`${LAST_VISITED_SITE_PREFIX}${userId}`)
  } catch {
    return null
  }
}

export function rememberLastVisitedSite(userId: string | undefined, siteId: string, storage = browserStorage()): void {
  if (!userId || !storage) return

  try {
    storage.setItem(`${LAST_VISITED_SITE_PREFIX}${userId}`, siteId)
  } catch {
    // Browser storage can be blocked or unavailable; navigation must still work.
  }
}

export function resolveStartSite<T extends Pick<Site, 'id' | 'name'>>(
  sites: readonly T[],
  preferredSiteId?: string | null,
  lastVisitedSiteId?: string | null
): T | undefined {
  return sites.find(site => site.id === preferredSiteId)
    ?? sites.find(site => site.id === lastVisitedSiteId)
    ?? sites[0]
}
