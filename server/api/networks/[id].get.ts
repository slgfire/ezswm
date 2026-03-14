import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const network = await networkRepository.byId(getRouterParam(event, 'id') || '')
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return network
})
