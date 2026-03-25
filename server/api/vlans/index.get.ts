import { vlanRepository } from '../../repositories/vlanRepository'
import { networkRepository } from '../../repositories/networkRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const siteId = query.site_id as string | undefined
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  const page = Math.max(1, parseInt(query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 20))

  let items = vlanRepository.list()

  if (siteId) {
    items = items.filter((v) => v.site_id === siteId)
  }

  if (status) {
    items = items.filter((v) => v.status === status)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter(
      (v) =>
        v.name.toLowerCase().includes(term) ||
        String(v.vlan_id).includes(term)
    )
  }

  // Add network_count to each VLAN
  const networks = networkRepository.list()
  const itemsWithCount = items.map((v) => ({
    ...v,
    network_count: networks.filter((n) => n.vlan_id === v.id).length,
  }))

  const total = itemsWithCount.length
  const totalPages = Math.ceil(total / perPage)
  const offset = (page - 1) * perPage
  const paginatedItems = itemsWithCount.slice(offset, offset + perPage)

  return {
    data: paginatedItems,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
  }
})
