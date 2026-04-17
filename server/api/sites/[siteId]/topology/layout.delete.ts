import { topologyLayoutRepository } from '../../../../repositories/topologyLayoutRepository'
import { siteRepository } from '../../../../repositories/siteRepository'

export default defineEventHandler((event) => {
  const siteId = event.context.params?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  if (!siteRepository.getById(siteId)) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  topologyLayoutRepository.deleteBySiteId(siteId)
  setResponseStatus(event, 204)
  return null
})
