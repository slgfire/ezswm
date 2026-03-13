import type { IpAllocation } from '~/types/models'
import { useStorage } from '~/server/storage'
import { validateAllocationAgainstRanges, validateAllocationPayload } from '../../../networks/_shared/validation'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')
  if (!networkId) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const body = await readBody<Partial<IpAllocation>>(event)
  const storage = useStorage()
  const network = await storage.networks.getById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  const existing = await storage.ipAllocations.listByNetwork(networkId)
  validateAllocationPayload(body, network, existing)
  const ranges = await storage.ipRanges.listByNetwork(networkId)
  validateAllocationAgainstRanges(body, ranges)

  return storage.ipAllocations.create({
    networkId,
    ipAddress: body.ipAddress!.trim(),
    hostname: body.hostname?.trim(),
    serviceName: body.serviceName?.trim(),
    deviceName: body.deviceName?.trim(),
    status: body.status || 'used',
    description: body.description?.trim(),
    notes: body.notes?.trim()
  })
})
