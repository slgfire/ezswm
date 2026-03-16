import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'

export default defineEventHandler((event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })
  return lagGroupRepository.list(switchId)
})
