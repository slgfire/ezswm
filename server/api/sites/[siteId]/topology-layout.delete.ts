import { topologyLayoutRepository } from '../../../repositories/topologyLayoutRepository'
import { siteRepository } from '../../../repositories/siteRepository'

export default defineEventHandler(async (event) => {
  const siteId = event.context.params?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  if (!(await siteRepository.getById(siteId))) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  await topologyLayoutRepository.deleteBySiteId(siteId)
  setResponseStatus(event, 204)
  return null
})
