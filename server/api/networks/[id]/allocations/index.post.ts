import { networkRepository } from '../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  body.networkId = getRouterParam(event, 'id') || ''
  return networkRepository.createAllocation(body)
})
