import { defineEventHandler, createError } from 'h3'
import { RELEASES_API_URL, transformReleases } from '../utils/changelog'
import type { GithubRelease, ChangelogResponse } from '../../types/changelog'

interface CacheEntry {
  data: ChangelogResponse
  timestamp: number
}

let cache: CacheEntry | null = null
let inflight: Promise<ChangelogResponse> | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function fetchChangelog(): Promise<ChangelogResponse> {
  let response: Response
  try {
    response = await fetch(RELEASES_API_URL, {
      headers: { 'User-Agent': 'ezSWM', Accept: 'application/vnd.github+json' }
    })
  } catch {
    throw createError({ statusCode: 503, message: 'Changelog unavailable — no internet connection' })
  }

  if (!response.ok) {
    throw createError({ statusCode: 503, message: 'Changelog unavailable — no internet connection' })
  }

  const raw = (await response.json()) as GithubRelease[]
  const data = transformReleases(raw)
  cache = { data, timestamp: Date.now() }
  return data
}

export default defineEventHandler(async (): Promise<ChangelogResponse> => {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }
  // Coalesce concurrent requests so a cache miss triggers one GitHub fetch.
  if (!inflight) {
    inflight = fetchChangelog().finally(() => { inflight = null })
  }
  return inflight
})
