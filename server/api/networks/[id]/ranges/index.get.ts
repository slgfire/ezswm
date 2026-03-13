import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')
  if (!networkId) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const storage = useStorage()
  const network = await storage.networks.getById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  return storage.ipRanges.listByNetwork(networkId)
})
