import { rangesRepository } from '~/server/repositories/ranges.repository'
import { networksRepository } from '~/server/repositories/networks.repository'
import { ipRangeSchema, validateIpInsideNetwork } from '~/server/schemas/domain'
import { ipv4ToInt } from '~/server/services/network-utils'
export default defineEventHandler(async (event) => {
  const parsed = ipRangeSchema.parse(await readBody(event))
  const network = await networksRepository.getById(parsed.networkId, event)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  if (!validateIpInsideNetwork(network.subnet, network.prefix, parsed.startIp) || !validateIpInsideNetwork(network.subnet, network.prefix, parsed.endIp)) throw createError({ statusCode: 422, statusMessage: 'Range must be inside subnet' })
  if (ipv4ToInt(parsed.startIp) > ipv4ToInt(parsed.endIp)) throw createError({ statusCode: 422, statusMessage: 'startIp must be <= endIp' })
  await rangesRepository.updateAll(items => [...items, parsed], event)
  return parsed
})
