import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const token = publicTokenRepository.getLatestBySwitchId(switchId)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No public token found' })
  }

  return token
})
