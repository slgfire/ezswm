import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  await networkRepository.delete(getRouterParam(event, 'id') || '')
  return { ok: true }
})
