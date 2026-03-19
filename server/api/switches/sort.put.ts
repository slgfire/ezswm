import { switchRepository } from '../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ order: string[] }>(event)
  if (!body?.order || !Array.isArray(body.order)) {
    throw createError({ statusCode: 400, message: 'order array required' })
  }

  switchRepository.updateSortOrder(body.order)
  return { ok: true }
})
