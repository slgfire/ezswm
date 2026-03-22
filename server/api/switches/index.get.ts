import { switchRepository } from '../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const location = query.location as string | undefined
  const manufacturer = query.manufacturer as string | undefined
  const role = query.role as string | undefined
  const tag = query.tag as string | undefined
  const isFavorite = query.is_favorite === 'true' ? true : query.is_favorite === 'false' ? false : undefined
  const search = query.search as string | undefined
  const page = Math.max(1, parseInt(query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(query.per_page as string, 10) || 20))

  const allSwitches = await switchRepository.list()
  let items = [...allSwitches]

  if (location) {
    items = items.filter((s) => s.location === location)
  }

  if (manufacturer) {
    items = items.filter((s) => s.manufacturer === manufacturer)
  }

  if (role) {
    items = items.filter((s) => s.role === role)
  }

  if (tag) {
    items = items.filter((s) => s.tags?.includes(tag))
  }

  if (isFavorite !== undefined) {
    items = items.filter((s) => s.is_favorite === isFavorite)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(term))
  }

  const total = items.length
  const totalPages = Math.ceil(total / perPage)
  const offset = (page - 1) * perPage
  const paginatedItems = items.slice(offset, offset + perPage)

  const locations = [...new Set(allSwitches.map(s => s.location).filter(Boolean))].sort() as string[]
  const tags = [...new Set(allSwitches.flatMap(s => s.tags || []))].sort()

  return {
    data: paginatedItems,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
    },
    filters: {
      locations,
      tags,
    }
  }
})
