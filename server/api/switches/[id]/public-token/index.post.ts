import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const sw = await switchRepository.getById(switchId)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Switch not found' })
  }

  // Use the resolved UUID — the route param may be a slug.
  const token = await publicTokenRepository.create(sw.id)
  setResponseStatus(event, 201)
  return token
})
