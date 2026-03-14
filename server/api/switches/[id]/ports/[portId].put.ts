import { switchRepository } from '../../../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const switchId = getRouterParam(event, 'id') || ''
  const portId = getRouterParam(event, 'portId') || ''
  const body = await readBody(event)
  const updated = await switchRepository.updatePort(switchId, portId, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Port not found' })
  return updated
})
