import { activityUndoRepository } from '../../../../repositories/activityUndoRepository'
import { userRepository } from '../../../../repositories/userRepository'
import { logActivity } from '../../../../utils/activityLog'
import { getAuthContext } from '../../../../utils/requireAdmin'
import { hasConflictToken, networkConflictError } from '../../../../repositories/networkRepository'

/**
 * Safe activity undo (plan A7). Preview without confirm; execution requires
 * confirm=true plus the preview's undoToken. The inverse runs against a state
 * precondition in one transaction (and, for create→delete, through the A5
 * guarded delete). Admin role is re-read from the DB at execution time.
 */
export default defineEventHandler(async (event) => {
  const auth = getAuthContext(event)
  if (!auth) throw createError({ statusCode: 401, message: 'Authentication required' })

  const user = await userRepository.getById(auth.userId)
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Administrator access required' })
  }

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Activity ID required' })

  const preview = await activityUndoRepository.getPreview(id)
  if (!preview) throw createError({ statusCode: 404, message: 'Activity entry not found' })
  if (!preview.undoable) {
    throw createError({ statusCode: 422, message: preview.reason ?? 'Activity entry is not undoable', data: preview })
  }

  const query = getQuery(event)
  const confirmed = query.confirm === 'true' || query.confirm === '1'
  if (!confirmed) {
    return {
      preview: true,
      requiresConfirmation: true,
      message: 'Re-call with confirm=true and the returned undoToken to execute this undo.',
      ...preview
    }
  }

  const expectedUndoToken = typeof query.expectedUndoToken === 'string' ? query.expectedUndoToken : undefined
  if (!expectedUndoToken) {
    throw createError({ statusCode: 400, message: 'expectedUndoToken is required: preview first, then confirm' })
  }

  let outcome
  try {
    outcome = await activityUndoRepository.execute(id, expectedUndoToken)
  } catch (err) {
    if ((err as { statusCode?: number })?.statusCode) throw err
    if (hasConflictToken(err, 'NETWORK_SUBNET_CONFLICT')) throw networkConflictError()
    if (hasConflictToken(err, 'IP_ALLOCATION_CONFLICT')) {
      throw createError({ statusCode: 409, message: 'IP address is already allocated in this network' })
    }
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 500, message: `Undo failed: ${message}` })
  }

  if (outcome.kind === 'not_found') throw createError({ statusCode: 404, message: 'Activity entry not found' })
  if (outcome.kind === 'unsupported') throw createError({ statusCode: 422, message: outcome.reason })
  if (outcome.kind === 'conflict') {
    throw createError({
      statusCode: 409,
      message: 'State changed since the preview; re-preview and confirm again',
      data: outcome.preview
    })
  }

  await logActivity(event, {
    action: 'update',
    entity_type: outcome.entry.entity_type,
    entity_id: outcome.entry.entity_id,
    entity_name: outcome.entry.entity_name,
    metadata: {
      undid_entry_id: outcome.entry.id,
      undone_action: outcome.entry.action,
      undo_contract: 'safe_v1'
    }
  }).catch(() => { /* the inverse already committed; never report it as failed because of audit logging */ })

  return {
    success: true,
    action: outcome.entry.action,
    entity_type: outcome.entry.entity_type,
    entity_id: outcome.entry.entity_id,
    inverse: outcome.inverse
  }
})
