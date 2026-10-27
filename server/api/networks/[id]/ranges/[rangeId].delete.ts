import { ipRangeImpactToken, ipRangeRepository } from '../../../../repositories/ipRangeRepository'
import { logActivity } from '../../../../utils/activityLog'
import { runSafeDelete } from '../../../../utils/deleteImpact'
import { getAuthContext } from '../../../../utils/requireAdmin'

/**
 * Safe IP range delete (plan A5): row-only delete, no schema relation references
 * an IpRange. API tokens preview, then confirm with the impactToken; JWT/UI
 * deletes without a precondition.
 */
export default defineEventHandler(async (event) => {
  const rangeId = event.context.params?.rangeId

  if (!rangeId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing range ID' })
  }

  const result = await runSafeDelete(event, {
    isApiToken: getAuthContext(event)?.authType === 'api_token',
    notFoundMessage: 'IP range not found',
    preview: () => ipRangeRepository.getDeleteImpact(rangeId),
    impactToken: ipRangeImpactToken,
    deleteGuarded: expected => ipRangeRepository.deleteGuarded(rangeId, expected)
  })

  if (result.kind === 'preview') return result.body

  const { range } = result.impact
  await logActivity(event, {
    action: 'delete',
    entity_type: 'ip_range',
    entity_id: rangeId,
    entity_name: `${range.start_ip} - ${range.end_ip}`,
  })

  setResponseStatus(event, 204)
  return null
})
