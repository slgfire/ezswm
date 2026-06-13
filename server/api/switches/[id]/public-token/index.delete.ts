import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

  const token = await publicTokenRepository.getBySwitchId(sw.id)
  if (!token) {
    throw createError({ statusCode: 404, message: 'No active public token found' })
  }

  const revoked = await publicTokenRepository.revoke(token.id)
  return revoked
})
