import { patchPanelRepository } from '../../../../repositories/patchPanelRepository'
import { patchPanelTokenRepository } from '../../../../repositories/patchPanelTokenRepository'
import { resolveSiteIdQuery } from '../../../../utils/resolveSiteParam'
import { requirePatchPanelsEnabled } from '../../../../utils/requirePatchPanelsEnabled'

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

  const panel = await patchPanelRepository.getByIdOrSlug(id, siteUuid)
  if (!panel || (siteUuid && panel.site_id !== siteUuid)) {
    throw createError({ statusCode: 404, statusMessage: 'Patch panel not found' })
  }

  const token = await patchPanelTokenRepository.create(panel.id)
  setResponseStatus(event, 201)
  return token
})
