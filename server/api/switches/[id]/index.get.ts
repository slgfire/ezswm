import { switchesRepository } from '~/server/repositories/switches.repository'
export default defineEventHandler(async (event) => {
  const item = await switchesRepository.getById(getRouterParam(event, 'id') || '', event)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return item
})
