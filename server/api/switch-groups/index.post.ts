import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { createSwitchGroupSchema } from '../../validators/switchGroupSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { requireSwitchGroupsEnabled } from '../../utils/requireSwitchGroupsEnabled'

export default defineEventHandler(async (event) => {
  await requireSwitchGroupsEnabled()

  const body = await readBody(event)
  const parsed = createSwitchGroupSchema.parse(body)

  const created = await switchGroupRepository.create(parsed)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'create',
    entity_type: 'switch_group',
    entity_id: created.id,
    entity_name: created.name
  })

  setResponseStatus(event, 201)
  return created
})
