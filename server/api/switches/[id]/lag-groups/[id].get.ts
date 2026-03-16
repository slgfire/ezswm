import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'

export default defineEventHandler((event) => {
  const lagId = event.context.params?.id
  if (!lagId) throw createError({ statusCode: 400, message: 'LAG group ID required' })

  const group = lagGroupRepository.getById(lagId)
  if (!group) throw createError({ statusCode: 404, message: 'LAG group not found' })
  return group
})
