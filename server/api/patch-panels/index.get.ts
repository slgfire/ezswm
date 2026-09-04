import { patchPanelRepository } from '../../repositories/patchPanelRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import { requirePatchPanelsEnabled } from '../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const query = getQuery(event)
  const siteId = await resolveSiteIdQuery(query.site_id as string | undefined)

  let items = await patchPanelRepository.list()
  if (siteId === null) {
    items = []
  } else if (siteId) {
    items = items.filter((panel) => panel.site_id === siteId)
  }

  return {
    data: items,
    meta: { total: items.length }
  }
})
