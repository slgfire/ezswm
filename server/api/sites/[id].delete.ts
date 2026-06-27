import { siteRepository } from '../../repositories/siteRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  const existing = await siteRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  const deleted = await siteRepository.delete(existing.id)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  setResponseStatus(event, 204)
  return null
})
