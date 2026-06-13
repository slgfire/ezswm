import { switchRepository } from '../../../../repositories/switchRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  const portId = getRouterParam(event, 'portId')!

  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

  // Reset port to defaults — clears all user-set fields and severs the
  // bidirectional connection link on both ends.
  return switchRepository.resetPort(sw.id, portId)
})
