import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)
  return await lagGroupRepository.list(sw.id)
})
