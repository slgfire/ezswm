import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const item = await switchRepository.byId(getRouterParam(event, 'id') || '')
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return item
})
