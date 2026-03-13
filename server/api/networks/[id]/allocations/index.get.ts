import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')
  if (!networkId) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  return useStorage().ipAllocations.listByNetwork(networkId)
})
