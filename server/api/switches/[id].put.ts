import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const updated = await switchRepository.update(id, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return updated
})
