import { activityRepository } from '../../repositories/activityRepository'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 25
  const offset = Number(query.offset) || 0

  const { entries, total } = activityRepository.list(limit, offset)
  return { data: entries, total }
})
