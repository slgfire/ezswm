import { siteRepository } from '../../repositories/siteRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  const site = siteRepository.getById(id)

  if (!site) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  return {
    ...site,
    _counts: siteRepository.getEntityCounts(id)
  }
})
