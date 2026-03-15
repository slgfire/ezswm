import { switchSchema } from '~/server/schemas/domain'
import { switchesRepository } from '~/server/repositories/switches.repository'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  const parsed = switchSchema.parse({ ...(await readBody(event)), id })
  let found = false
  await switchesRepository.updateAll(items => items.map(item => item.id === id ? ((found = true), parsed) : item), event)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return parsed
})
