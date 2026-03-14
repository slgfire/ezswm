import { createError } from 'h3'
import { switchRepository } from '../../../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const portNumber = Number(getRouterParam(event, 'portNumber') || 0)
  const payload = await readBody(event)

  const item = await switchRepository.getById(id)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

  const index = item.ports.findIndex(port => port.portNumber === portNumber)
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'Port not found' })

  item.ports[index] = { ...item.ports[index], ...payload }
  await switchRepository.update(id, { ports: item.ports })

  return item.ports[index]
})
