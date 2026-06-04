import { topologyLayoutRepository } from '../../../repositories/topologyLayoutRepository'
import { resolveSiteParam } from '../../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const site = await resolveSiteParam(event.context.params?.siteId)
  if (!site) {
    throw createError({ statusCode: 400, statusMessage: 'Topology layout is not available for the "all" view' })
  }
  const layout = await topologyLayoutRepository.getBySiteId(site.id)
  return layout ?? { node_positions: {} }
})
