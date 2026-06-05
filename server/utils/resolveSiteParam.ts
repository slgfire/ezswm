import type { Site } from '../../types/site'
import { siteRepository } from '../repositories/siteRepository'

/**
 * Resolve a `:siteId` URL parameter to the canonical Site object.
 *
 * The path segment may be one of:
 *   - a Site UUID (the historical form)
 *   - a Site slug (the new canonical form)
 *   - the literal string "all" — site-aggregating routes pass this through
 *     unchanged; this helper returns `null` so the caller can branch.
 *
 * Throws `400` if missing and `404` if neither id nor slug resolves.
 */
export async function resolveSiteParam(param: string | undefined): Promise<Site | null> {
  if (!param) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }
  if (param === 'all') return null

  const site = await siteRepository.getById(param)
  if (!site) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }
  return site
}

/**
 * Resolve a `?site_id=...` query parameter to a canonical Site UUID.
 *
 * Used by list endpoints (e.g. /api/switches, /api/networks) that filter by
 * `site_id`. Accepts UUID or slug; returns the UUID, undefined when no filter,
 * or null when the caller explicitly filters by an unknown site.
 */
export async function resolveSiteIdQuery(siteIdParam: string | undefined): Promise<string | null | undefined> {
  if (!siteIdParam) return undefined
  if (siteIdParam === 'all') return undefined
  const site = await siteRepository.getById(siteIdParam)
  return site ? site.id : null
}

/**
 * Resolve a `site_id` value from a create/update request body — UUID or slug —
 * to the canonical Site UUID. Throws 404 if neither matches.
 *
 * Used by repository .create() methods so the rest of the persistence path can
 * assume a UUID and the foreign-key constraint always lands. Without this the
 * frontend can accidentally ship a slug as `site_id` (since URL params are
 * now slug-shaped) and the insert fails with an opaque DB error.
 */
export async function resolveSiteIdToUuid(siteIdValue: string): Promise<string> {
  const site = await siteRepository.getById(siteIdValue)
  if (!site) {
    throw createError({ statusCode: 404, statusMessage: `Site not found: ${siteIdValue}` })
  }
  return site.id
}
