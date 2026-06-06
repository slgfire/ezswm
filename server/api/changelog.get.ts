import { loadChangelog } from '../utils/changelog'
import type { ChangelogResponse } from '../../types/changelog'

interface CacheEntry {
  data: ChangelogResponse
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export default defineEventHandler(async (event): Promise<ChangelogResponse> => {
  const locale = String(getQuery(event).locale ?? 'en')

  // Skip cache in dev so edits to CHANGELOG/*.md are immediately visible.
  if (process.env.NODE_ENV === 'production') {
    const hit = cache.get(locale)
    if (hit && Date.now() - hit.timestamp < CACHE_TTL) return hit.data
  }

  const data = await loadChangelog(locale)
  if (process.env.NODE_ENV === 'production') {
    cache.set(locale, { data, timestamp: Date.now() })
  }
  return data
})
