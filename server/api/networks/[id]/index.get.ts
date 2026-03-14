import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [network, allocations, ranges] = await Promise.all([
    repositories.networks.findById(id),
    repositories.allocations.byNetwork(id),
    repositories.ranges.byNetwork(id)
  ])
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return { ...network, allocations, ranges }
})
