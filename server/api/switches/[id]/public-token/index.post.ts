import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const sw = switchRepository.getById(switchId)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Switch not found' })
  }

  const token = publicTokenRepository.create(switchId)
  setResponseStatus(event, 201)
  return token
})
