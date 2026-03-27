import { siteRepository } from '../../repositories/siteRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const search = query.search as string | undefined
  const page = Math.max(1, parseInt(query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 20))

  const allSites = siteRepository.list()
  let items = [...allSites]

  if (search) {
    const term = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term))
  }

  const total = items.length
  const totalPages = Math.ceil(total / perPage)
  const offset = (page - 1) * perPage
  const paginatedItems = items.slice(offset, offset + perPage)

  const data = paginatedItems.map(site => ({
    ...site,
    _counts: siteRepository.getEntityCounts(site.id)
  }))

  return {
    data,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    }
  }
})
