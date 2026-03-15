import { networksRepository } from '~/server/repositories/networks.repository'
export default defineEventHandler(async (event) => {
  const item = await networksRepository.getById(getRouterParam(event, 'id') || '', event)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return item
})
