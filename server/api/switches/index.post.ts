import { switchSchema } from '~/server/schemas/domain'
import { switchesRepository } from '~/server/repositories/switches.repository'
export default defineEventHandler(async (event) => {
  const parsed = switchSchema.parse(await readBody(event))
  if (await switchesRepository.getById(parsed.id, event)) throw createError({ statusCode: 409, statusMessage: 'Switch ID already exists' })
  await switchesRepository.create(parsed, event)
  return parsed
})
