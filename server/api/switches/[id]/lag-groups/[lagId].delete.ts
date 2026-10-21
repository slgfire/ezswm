import { lagGroupImpactToken, lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { logActivity } from '../../../../utils/activityLog'
import { runSafeDelete } from '../../../../utils/deleteImpact'
import { getAuthContext } from '../../../../utils/requireAdmin'
import { deleteLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

/**
 * Safe LAG delete (plan A5): the preview/reset/remote options are part of the
 * impact token. API tokens confirm with the impactToken; JWT/UI deletes without
 * a precondition.
 */
export default defineEventHandler(async (event) => {
  const sw = await resolveSwitchParam(event)

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const parsed = deleteLagGroupSchema.safeParse((await readBody(event).catch(() => null)) ?? {})
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid delete request' })

  const group = await lagGroupRepository.getById(lagId)
  if (!group || group.switch_id !== sw.id) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const result = await runSafeDelete(event, {
    isApiToken: getAuthContext(event)?.authType === 'api_token',
    notFoundMessage: 'LAG group not found',
    preview: () => lagGroupRepository.getDeleteImpact(lagId, parsed.data),
    impactToken: lagGroupImpactToken,
    deleteGuarded: expected => lagGroupRepository.deleteGuarded(lagId, parsed.data, expected)
  })

  if (result.kind === 'preview') return result.body

  const portLabels = group.port_ids
    .map(pid => sw?.ports.find(p => p.id === pid)?.label || pid)

  await logActivity(event, {
    action: 'delete',
    entity_type: 'lag_group',
    entity_id: group.id,
    entity_name: group.name,
    metadata: {
      ports: portLabels,
      port_count: group.port_ids.length,
    },
  })

  setResponseStatus(event, 204)
  return null
})
