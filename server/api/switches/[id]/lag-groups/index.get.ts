import { lagGroupRepository } from '../../../../repositories/lagGroupRepository'
import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, message: 'Switch ID required' })

  // The route param may be a slug — resolve to the real PK before listing by switch_id.
  const sw = await switchRepository.getById(switchId)
  if (!sw) throw createError({ statusCode: 404, message: 'Switch not found' })

  return await lagGroupRepository.list(sw.id)
})
