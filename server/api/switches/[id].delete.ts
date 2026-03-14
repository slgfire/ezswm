import { createError } from 'h3'
import { switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const ok = await switchRepository.remove(getRouterParam(event, 'id') || '')
  if (!ok) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return { success: true }
})
