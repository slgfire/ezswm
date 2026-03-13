import type { IpAllocation } from '~/types/models'
import { useStorage } from '~/server/storage'
import { validateAllocationAgainstRanges, validateAllocationPayload } from '../networks/_shared/validation'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Allocation ID is required.' })

  const body = await readBody<Partial<IpAllocation>>(event)
  const storage = useStorage()
  const current = await storage.ipAllocations.getById(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Allocation not found.' })

  const network = await storage.networks.getById(current.networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  const existing = await storage.ipAllocations.listByNetwork(current.networkId)
  validateAllocationPayload({ ...body, id }, network, existing)
  const ranges = await storage.ipRanges.listByNetwork(current.networkId)
  validateAllocationAgainstRanges({ ...body, id }, ranges)

  const updated = await storage.ipAllocations.update(id, {
    ipAddress: body.ipAddress?.trim(),
    hostname: body.hostname?.trim(),
    serviceName: body.serviceName?.trim(),
    deviceName: body.deviceName?.trim(),
    status: body.status,
    description: body.description?.trim(),
    notes: body.notes?.trim()
  })

  return updated
})
