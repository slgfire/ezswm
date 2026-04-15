import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  const token = publicTokenRepository.getBySwitchId(switchId)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No active public token found' })
  }

  const revoked = publicTokenRepository.revoke(token.id)
  return revoked
})
