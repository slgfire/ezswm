import type { IpRange } from '~/types/models'
import { useStorage } from '~/server/storage'
import { validateIpRangePayload } from '../../_shared/validation'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')
  if (!networkId) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const body = await readBody<Partial<IpRange>>(event)
  const storage = useStorage()
  const network = await storage.networks.getById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  const existing = await storage.ipRanges.listByNetwork(networkId)
  validateIpRangePayload(body, network, existing)

  return storage.ipRanges.create({
    networkId,
    name: body.name!.trim(),
    type: body.type!,
    startIp: body.startIp!.trim(),
    endIp: body.endIp!.trim(),
    description: body.description?.trim(),
    notes: body.notes?.trim()
  })
})
