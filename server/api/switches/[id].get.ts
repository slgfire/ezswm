import { createError } from 'h3'
import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const item = await switchRepository.getById(getRouterParam(event, 'id') || '')
  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }
  return item
})
