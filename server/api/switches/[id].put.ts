import { createError } from 'h3'
import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  const item = await switchRepository.update(id, payload)
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }
  return item
})
