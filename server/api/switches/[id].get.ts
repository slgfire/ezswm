import { switchRepository } from '../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const switchItem = await switchRepository.getById(id)

  if (!switchItem) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  return switchItem
})
