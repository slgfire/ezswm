import { patchPanelRepository } from '../../repositories/patchPanelRepository'
import { createPatchPanelSchema } from '../../validators/patchPanelSchemas'
import { logActivity } from '../../utils/activityLog'
import { requirePatchPanelsEnabled } from '../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const body = await readBody(event)
  const parsed = createPatchPanelSchema.parse(body)
  const created = await patchPanelRepository.create(parsed)

  await logActivity(event, {
    action: 'create',
    entity_type: 'patch_panel',
    entity_id: created.id,
    entity_name: created.name
  })

  setResponseStatus(event, 201)
  return created
})
