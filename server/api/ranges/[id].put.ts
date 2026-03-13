import type { IpRange } from '~/types/models'
import { useStorage } from '~/server/storage'
import { validateIpRangePayload } from '../networks/_shared/validation'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Range ID is required.' })

  const body = await readBody<Partial<IpRange>>(event)
  const storage = useStorage()
  const current = await storage.ipRanges.getById(id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Range not found.' })

  const network = await storage.networks.getById(current.networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  const existing = await storage.ipRanges.listByNetwork(current.networkId)
  validateIpRangePayload({ ...body, id }, network, existing)

  return storage.ipRanges.update(id, {
    name: body.name?.trim(),
    type: body.type,
    startIp: body.startIp?.trim(),
    endIp: body.endIp?.trim(),
    description: body.description?.trim(),
    notes: body.notes?.trim()
  })
})
