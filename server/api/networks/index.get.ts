import { networkRepository } from '../../repositories/networkRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const vlanId = query.vlan_id as string | undefined
  const search = query.search as string | undefined
  const page = Math.max(1, parseInt(query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 20))

  let items = networkRepository.list()

  if (vlanId) {
    items = items.filter((n) => n.vlan_id === vlanId)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter(
      (n) =>
        n.name.toLowerCase().includes(term) ||
        n.subnet.toLowerCase().includes(term)
    )
  }

  const total = items.length
  const totalPages = Math.ceil(total / perPage)
  const offset = (page - 1) * perPage
  const paginatedItems = items.slice(offset, offset + perPage)

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
