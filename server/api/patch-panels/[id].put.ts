import { patchPanelRepository } from '../../repositories/patchPanelRepository'
import { updatePatchPanelSchema } from '../../validators/patchPanelSchemas'
import { activityRepository } from '../../repositories/activityRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import { requirePatchPanelsEnabled } from '../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing patch panel ID' })
  }

  const query = getQuery(event)
  const siteIdParam = typeof query.siteId === 'string' ? query.siteId : undefined
  const resolvedSiteId = await resolveSiteIdQuery(siteIdParam)
  if (siteIdParam && resolvedSiteId === null) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }
  const siteUuid = resolvedSiteId ?? undefined

  const existing = await patchPanelRepository.getByIdOrSlug(id, siteUuid)
  if (!existing || (siteUuid && existing.site_id !== siteUuid)) {
    throw createError({ statusCode: 404, statusMessage: 'Patch panel not found' })
  }

  const body = await readBody(event)
  const parsed = updatePatchPanelSchema.parse(body)
  const updated = await patchPanelRepository.update(existing.id, parsed as { name?: string; description?: string | null; slug?: string }, siteUuid)

  await activityRepository.log({
    user_id: event.context.auth.userId,
    action: 'update',
    entity_type: 'patch_panel',
    entity_id: existing.id,
    entity_name: updated.name,
    changes: parsed as Record<string, unknown>,
    previous_state: existing as unknown as Record<string, unknown>
  })

  return updated
})
