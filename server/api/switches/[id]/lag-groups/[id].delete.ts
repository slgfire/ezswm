import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'

export default defineEventHandler((event) => {
  const lagId = event.context.params?.id
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const deleted = lagGroupRepository.delete(lagId)
  if (!deleted) throw createError({ statusCode: 404, message: 'LAG group not found' })

  setResponseStatus(event, 204)
  return null
})
