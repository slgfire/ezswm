import { useStorage } from '~/server/storage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const storage = useStorage()
  const network = await storage.networks.getById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  const allocations = await storage.ipAllocations.listByNetwork(id)
  return { ...network, allocations }
})
