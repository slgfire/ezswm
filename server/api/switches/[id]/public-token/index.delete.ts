import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) {
    throw createError({ statusCode: 400, message: 'Missing switch ID' })
  }

  // The route param may be a slug — resolve to the real PK before querying by switch_id.
  const sw = await switchRepository.getById(switchId)
  if (!sw) {
    throw createError({ statusCode: 404, message: 'Switch not found' })
  }

  const token = await publicTokenRepository.getBySwitchId(sw.id)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No active public token found' })
  }

  const revoked = await publicTokenRepository.revoke(token.id)
  return revoked
})
