import { createError } from 'h3'
import { switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const updated = await switchRepository.update(id, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return updated
})
