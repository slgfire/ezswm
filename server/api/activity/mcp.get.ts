import { activityRepository } from '../../repositories/activityRepository'
import { describeUndo } from '../../repositories/activityUndoRepository'
import { activityQuerySchema } from '../../validators/activitySchemas'

/**
 * Sanitized activity list for API tokens (plan A7). Returns identity, actor
 * display, action, entity reference and an undoability hint — never
 * previous_state/metadata/changes. Pagination is bounded by the validator.
 */
export default defineEventHandler(async (event) => {
  const parsed = activityQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'limit must be 1-100 and offset must be 0-100000' })
  }

  const { limit, offset } = parsed.data
  const { entries, total } = await activityRepository.listSanitized(limit, offset)

  return {
    data: entries.map(entry => {
      const described = describeUndo(entry.action, entry.entity_type)
      return {
        ...entry,
        undoable: described.undoable,
        ...(described.reason ? { undo_reason: described.reason } : {})
      }
    }),
    total,
    limit,
    offset
  }
})
