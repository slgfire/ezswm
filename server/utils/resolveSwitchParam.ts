import type { H3Event } from 'h3'
import type { Switch } from '../../types/switch'
import { switchRepository } from '../repositories/switchRepository'
import { resolveSiteIdQuery } from './resolveSiteParam'

/**
 * Resolve the `[id]` route param of a `/api/switches/[id]/...` endpoint to the
 * canonical Switch.
 *
 * The param may be a switch UUID or a switch **slug**. Switch slugs are unique
 * per site, not globally, so a `?siteId=<uuid-or-slug>` query is honoured to
 * disambiguate when the same slug exists on multiple sites (mirrors the
 * behaviour of `/api/switches/[id]` GET/PUT). Throws 400 if the param is
 * missing and 404 if it doesn't resolve.
 */
export async function resolveSwitchParam(event: H3Event): Promise<Switch> {
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = (await resolveSiteIdQuery(siteIdParam)) ?? undefined

  const sw = await switchRepository.getByIdOrSlug(id, siteUuid)
  if (!sw) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }
  return sw
}
