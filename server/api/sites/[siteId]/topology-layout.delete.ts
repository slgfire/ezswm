import { topologyLayoutRepository } from '../../../repositories/topologyLayoutRepository'
import { resolveSiteParam } from '../../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const site = await resolveSiteParam(event.context.params?.siteId)
  if (!site) {
    throw createError({ statusCode: 400, statusMessage: 'Topology layout is not available for the "all" view' })
  }
  await topologyLayoutRepository.deleteBySiteId(site.id)
  setResponseStatus(event, 204)
  return null
})
