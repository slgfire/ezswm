import { ipAllocationImpactToken, ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { logActivity } from '../../../../utils/activityLog'
import { runSafeDelete } from '../../../../utils/deleteImpact'
import { getAuthContext } from '../../../../utils/requireAdmin'

/**
 * Safe allocation delete (plan A5): API tokens preview, then confirm with the
 * impactToken; JWT/UI deletes without a precondition. Port links are cleared by
 * the FK (SetNull), peer links stay intact.
 */
export default defineEventHandler(async (event) => {
  const allocId = event.context.params?.allocId

  if (!allocId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing allocation ID' })
  }

  const result = await runSafeDelete(event, {
    isApiToken: getAuthContext(event)?.authType === 'api_token',
    notFoundMessage: 'IP allocation not found',
    preview: () => ipAllocationRepository.getDeleteImpact(allocId),
    impactToken: ipAllocationImpactToken,
    deleteGuarded: expected => ipAllocationRepository.deleteGuarded(allocId, expected)
  })

  if (result.kind === 'preview') return result.body

  await logActivity(event, {
    action: 'delete',
    entity_type: 'ip_allocation',
    entity_id: allocId,
    entity_name: result.impact.allocation.ip_address,
  })

  setResponseStatus(event, 204)
  return null
})
