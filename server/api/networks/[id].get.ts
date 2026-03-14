import { createError } from 'h3'
import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const item = await networkRepository.getById(getRouterParam(event, 'id') || '')
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return item
})
