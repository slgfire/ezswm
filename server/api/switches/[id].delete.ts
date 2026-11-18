import { switchRepository } from '../../repositories/switchRepository'
import { logActivity } from '../../utils/activityLog'
import { lagGroupRepository } from '../../repositories/lagGroupRepository'
import { publicTokenRepository } from '../../repositories/publicTokenRepository'
import { resolveSwitchParam } from '../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  const existing = await resolveSwitchParam(event)

  // Clean up LAG groups before deleting switch
  await lagGroupRepository.deleteBySwitchId(existing.id)
  await publicTokenRepository.deleteBySwitchId(existing.id)

  await switchRepository.delete(existing.id)

  await logActivity(event, {
    action: 'delete',
    entity_type: 'switch',
    entity_id: existing.id,
    entity_name: existing.name,
  })

  setResponseStatus(event, 204)
  return null
})
