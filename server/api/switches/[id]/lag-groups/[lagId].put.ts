import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'
import { activityRepository } from '../../../../repositories/activityRepository'
import { updateLagGroupSchema } from '../../../../validators/lagGroupSchemas'
import type { LAGGroup } from '../../../../../types/lagGroup'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  const lagId = event.context.params?.lagId
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const body = await readBody(event)
  const validated = updateLagGroupSchema.parse(body)

  // Get current state before update for diff
  const before = lagGroupRepository.getById(lagId)
  if (!before) throw createError({ statusCode: 404, message: 'LAG group not found' })

  const updated = lagGroupRepository.update(lagId, validated as Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>)

  // Compute diff for metadata (server-side, don't trust client)
  const sw = switchRepository.getById(switchId)
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

  activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update',
    entity_type: 'lag_group',
    entity_id: updated.id,
    entity_name: updated.name,
    metadata,
  })

  return updated
})
