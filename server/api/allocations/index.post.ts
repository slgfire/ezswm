import { allocationsRepository } from '~/server/repositories/allocations.repository'
import { networksRepository } from '~/server/repositories/networks.repository'
import { ipAllocationSchema, validateIpInsideNetwork } from '~/server/schemas/domain'
export default defineEventHandler(async (event) => {
  const parsed = ipAllocationSchema.parse(await readBody(event))
  const network = await networksRepository.getById(parsed.networkId, event)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  if (!validateIpInsideNetwork(network.subnet, network.prefix, parsed.ipAddress)) throw createError({ statusCode: 422, statusMessage: 'IP must belong to subnet' })
  const all = await allocationsRepository.list(event)
  if (all.some(item => item.networkId === parsed.networkId && item.ipAddress === parsed.ipAddress)) throw createError({ statusCode: 409, statusMessage: 'Duplicate IP in network' })
  await allocationsRepository.updateAll(items => [...items, parsed], event)
  return parsed
})
