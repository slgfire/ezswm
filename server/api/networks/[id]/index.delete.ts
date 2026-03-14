import { repositories } from '../../../repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await repositories.networks.delete(id)
  const [allocations, ranges] = await Promise.all([
    repositories.allocations.byNetwork(id),
    repositories.ranges.byNetwork(id)
  ])
  await Promise.all([
    ...allocations.map(item => repositories.allocations.delete(item.id)),
    ...ranges.map(item => repositories.ranges.delete(item.id))
  ])
  return { ok: true }
})
