import { publicTokenRepository } from '../../../../repositories/publicTokenRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

  const token = await publicTokenRepository.create(sw.id)
  setResponseStatus(event, 201)
  return token
})
