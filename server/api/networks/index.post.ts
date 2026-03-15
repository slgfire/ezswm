import { networkSchema } from '~/server/schemas/domain'
import { networksRepository } from '~/server/repositories/networks.repository'
export default defineEventHandler(async (event) => {
  const parsed = networkSchema.parse(await readBody(event))
  if (await networksRepository.getById(parsed.id, event)) throw createError({ statusCode: 409, statusMessage: 'Network ID already exists' })
  await networksRepository.updateAll(items => [...items, parsed], event)
  return parsed
})
