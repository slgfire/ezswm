import { createError } from 'h3'
import { switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const item = await switchRepository.findById(getRouterParam(event, 'id') || '')
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return item
})
