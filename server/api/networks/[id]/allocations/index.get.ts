import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../../repositories/networkRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing network ID' })
  }

  const network = networkRepository.getById(id)

  if (!network) {
    throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  }

  const query = getQuery(event)

  const status = query.status as string | undefined
  const deviceType = query.device_type as string | undefined
  const search = query.search as string | undefined

  let items = ipAllocationRepository.list(id)

  if (status) {
    items = items.filter((a) => a.status === status)
  }

  if (deviceType) {
    items = items.filter((a) => a.device_type === deviceType)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter(
      (a) =>
        a.ip_address.toLowerCase().includes(term) ||
        (a.hostname && a.hostname.toLowerCase().includes(term)) ||
        (a.mac_address && a.mac_address.toLowerCase().includes(term)) ||
        (a.description && a.description.toLowerCase().includes(term))
    )
  }

  return {
    data: items,
    meta: { total: items.length },
  }
})
