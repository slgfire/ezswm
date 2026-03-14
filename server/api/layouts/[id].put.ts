import { createError } from 'h3'
import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const payload = await readBody(event)
  const item = await layoutRepository.update(id, payload)
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Layout not found' })
  return item
})
