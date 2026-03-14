import { repositories } from '../../../../../repositories'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')!
  const allocationId = getRouterParam(event, 'allocationId')!
  const body = await readBody(event)
  const network = await repositories.networks.findById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  const current = await repositories.allocations.findById(allocationId)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Allocation not found' })
  const payload = { ...current, ...body, id: allocationId, networkId }
  await repositories.allocations.validate(payload, network, allocationId)
  return repositories.allocations.update(allocationId, body)
})
