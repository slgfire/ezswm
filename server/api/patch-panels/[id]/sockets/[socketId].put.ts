import { patchPanelRepository } from '../../../../repositories/patchPanelRepository'
import { updatePatchPanelSocketSchema } from '../../../../validators/patchPanelSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../../../utils/resolveSiteParam'
import { requirePatchPanelsEnabled } from '../../../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const panelIdOrSlug = event.context.params?.id
  const socketId = event.context.params?.socketId
  if (!panelIdOrSlug || !socketId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing patch panel or socket ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const resolvedSiteId = await resolveSiteIdQuery(siteIdParam)
  if (siteIdParam && resolvedSiteId === null) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }
  const siteUuid = resolvedSiteId ?? undefined

  const panel = await patchPanelRepository.getByIdOrSlug(panelIdOrSlug, siteUuid)
  if (!panel || (siteUuid && panel.site_id !== siteUuid)) {
    throw createError({ statusCode: 404, statusMessage: 'Patch panel not found' })
  }

  const body = await readBody(event)
  const parsed = updatePatchPanelSocketSchema.parse(body)
  const updated = await patchPanelRepository.updateSocket(panel.id, socketId, parsed)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'patch_panel_socket',
    entity_id: updated.id,
    entity_name: `${panel.name} ${updated.port_number}${updated.side}`,
    metadata: { patch_panel_id: panel.id }
  })

  return updated
})
