import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  await switchRepository.delete(getRouterParam(event, 'id') || '')
  return { ok: true }
})
