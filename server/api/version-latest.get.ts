import { defineEventHandler } from 'h3'
import type { LatestVersionResponse } from '../../types/changelog'

const LATEST_API_URL = 'https://api.github.com/repos/slgfire/ezswm/releases/latest'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

let cache: { tag: string; timestamp: number } | null = null
let inflight: Promise<LatestVersionResponse> | null = null

async function fetchLatest(): Promise<LatestVersionResponse> {
  try {
    const res = await fetch(LATEST_API_URL, {
      headers: { 'User-Agent': 'ezSWM', Accept: 'application/vnd.github+json' }
    })
    if (!res.ok) return { latest: null }
    const data = await res.json() as { tag_name?: string }
    const tag = data.tag_name?.replace(/^v/, '') ?? null
    if (tag) cache = { tag, timestamp: Date.now() }
    return { latest: tag }
  } catch {
    return { latest: null }
  }
}

export default defineEventHandler(async (): Promise<LatestVersionResponse> => {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { latest: cache.tag }
  }
  if (!inflight) {
    inflight = fetchLatest().finally(() => { inflight = null })
  }
  return inflight
})
