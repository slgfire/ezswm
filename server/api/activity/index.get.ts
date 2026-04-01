import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 25
  const offset = Number(query.offset) || 0
  const entityId = query.entity_id as string | undefined

  let { entries, total } = activityRepository.list(undefined, undefined)

  // Filter by entity_id if provided
  if (entityId) {
    entries = entries.filter(e => e.entity_id === entityId)
    total = entries.length
  }

  const start = offset
  const end = start + limit
  return { data: entries.slice(start, end), total }
})
