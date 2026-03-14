import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => {
  await layoutRepository.delete(getRouterParam(event, 'id') || '')
  return { ok: true }
})
