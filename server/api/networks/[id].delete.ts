import { networkImpactToken, networkRepository } from '../../repositories/networkRepository'
import { logActivity } from '../../utils/activityLog'
import { getAuthContext } from '../../utils/requireAdmin'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

/**
 * Safe network delete (plan A5):
 * - API tokens: no `confirm=true` → non-destructive preview with `impactToken`;
 *   `confirm=true` without `expectedImpactToken` → 400; stale token → 409 with a
 *   fresh preview; matching token → atomic delete.
 * - JWT/UI: unchanged, deletes without a precondition (same atomic implementation).
 */
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const siteUuid = await resolveSiteIdQuery(siteIdParam) ?? undefined
  const isApiToken = getAuthContext(event)?.authType === 'api_token'
  const confirmed = query.confirm === 'true' || query.confirm === '1'

  if (isApiToken && !confirmed) {
    const impact = await networkRepository.getDeleteImpact(id, siteUuid)
    if (!impact) {
      throw createError({ statusCode: 404, statusMessage: 'Network not found' })
    }
    return {
      preview: true,
      requiresConfirmation: true,
      message: 'Re-call with confirm=true and the returned impactToken to delete.',
      impactToken: networkImpactToken(impact),
      impact
    }
  }

  const expectedImpactToken = typeof query.expectedImpactToken === 'string' ? query.expectedImpactToken : undefined
  if (isApiToken && !expectedImpactToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'expectedImpactToken is required: preview first, then pass its impactToken with confirm=true'
    })
  }

  const outcome = await networkRepository.deleteGuarded(id, siteUuid, isApiToken ? expectedImpactToken : undefined)

  if (outcome.kind === 'not_found') {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  if (outcome.kind === 'conflict') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Network state changed since the preview; re-fetch the impact and confirm again',
      data: {
        requiresConfirmation: true,
        impactToken: outcome.impactToken,
        impact: outcome.impact
      }
    })
  }

  await logActivity(event, {
    action: 'delete',
    entity_type: 'network',
    entity_id: outcome.impact.network.id,
    entity_name: outcome.impact.network.name,
  })

  setResponseStatus(event, 204)
  return null
})
