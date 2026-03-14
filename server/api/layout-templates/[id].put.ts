import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => {
  const updated = await layoutRepository.update(getRouterParam(event, 'id') || '', await readBody(event))
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Layout template not found' })
  return updated
})
