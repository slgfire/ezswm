import { vlanImpactToken, vlanRepository, type VlanDeleteImpact } from '../../repositories/vlanRepository'
import { logActivity } from '../../utils/activityLog'
import { runSafeDelete } from '../../utils/deleteImpact'
import { getAuthContext } from '../../utils/requireAdmin'

/**
 * Safe VLAN delete (plan A5): networks are untagged via FK SetNull, so a preview
 * lists them and reports the existing untagged-scope CIDR conflict as blocking.
 * API tokens confirm with the impactToken; JWT/UI deletes without a precondition.
 */
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const result = await runSafeDelete(event, {
    isApiToken: getAuthContext(event)?.authType === 'api_token',
    notFoundMessage: 'VLAN not found',
    preview: () => vlanRepository.getDeleteImpact(id),
    impactToken: vlanImpactToken,
    deleteGuarded: expected => vlanRepository.deleteGuarded(id, expected)
  })

  if (result.kind === 'preview') {
    const impact = result.body.impact as VlanDeleteImpact
    if (impact.conflicts.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Deleting this VLAN would make network subnets duplicate within the untagged scope of the site',
        data: { ...result.body, blocked: true, code: 'VLAN_NETWORK_SUBNET_CONFLICT', conflicts: impact.conflicts }
      })
    }
    return result.body
  }

  await logActivity(event, {
    action: 'delete',
    entity_type: 'vlan',
    entity_id: id,
    entity_name: result.impact.vlan.name,
  })

  setResponseStatus(event, 204)
  return null
})
