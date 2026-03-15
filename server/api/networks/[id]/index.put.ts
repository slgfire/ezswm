import { networkSchema } from '~/server/schemas/domain'
import { networksRepository } from '~/server/repositories/networks.repository'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  const parsed = networkSchema.parse({ ...(await readBody(event)), id })
  let found = false
  await networksRepository.updateAll(items => items.map(item => item.id === id ? ((found = true), parsed) : item), event)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return parsed
})
