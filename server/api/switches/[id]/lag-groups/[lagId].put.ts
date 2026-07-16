import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { updateLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'
import type { LAGGroup } from '../../../../../types/lagGroup'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const body = await readBody(event)
  const validated = updateLagGroupSchema.parse(body)

  const sw = await resolveSwitchParam(event)

  // Validate ownership before the first mutation (and again inside update's transaction).
  const before = await lagGroupRepository.getById(lagId)
  if (!before || before.switch_id !== sw.id) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const updated = await lagGroupRepository.update(lagId, validated as Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>, sw.id)

  // Compute diff for metadata (server-side, don't trust client)
  const resolveLabel = (pid: string) => sw?.ports.find(p => p.id === pid)?.label || pid

  const metadata: Record<string, unknown> = {}
  if (validated.port_ids) {
    const added = validated.port_ids.filter(p => !before.port_ids.includes(p))
    const removed = before.port_ids.filter(p => !validated.port_ids!.includes(p))
    if (added.length) metadata.added_ports = added.map(resolveLabel)
    if (removed.length) metadata.removed_ports = removed.map(resolveLabel)
  }
  // Log name/remote_device changes for audit trail
  if (validated.name && validated.name !== before.name) {
    metadata.before_name = before.name
  }
  if (validated.remote_device !== undefined && validated.remote_device !== before.remote_device) {
    metadata.before_remote_device = before.remote_device || null
  }

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'lag_group',
    entity_id: updated.id,
    entity_name: updated.name,
    metadata,
  })

  return updated
})
