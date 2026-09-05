import { patchPanelRepository } from '../../repositories/patchPanelRepository'
import { createPatchPanelSchema } from '../../validators/patchPanelSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { requirePatchPanelsEnabled } from '../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const body = await readBody(event)
  const parsed = createPatchPanelSchema.parse(body)
  const created = await patchPanelRepository.create(parsed)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'create',
    entity_type: 'patch_panel',
    entity_id: created.id,
    entity_name: created.name
  })

  setResponseStatus(event, 201)
  return created
})
