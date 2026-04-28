import { ipRangeRepository } from '../../../../repositories/ipRangeRepository'
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

  const type = query.type as string | undefined
  const search = query.search as string | undefined

  let items = ipRangeRepository.list(id)

  if (type) {
    items = items.filter((r) => r.type === type)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter(
      (r) =>
        r.start_ip.includes(term) ||
        r.end_ip.includes(term) ||
        (r.description && r.description.toLowerCase().includes(term))
    )
  }

  return {
    data: items,
    meta: { total: items.length },
  }
})
