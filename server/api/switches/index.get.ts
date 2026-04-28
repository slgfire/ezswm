import { switchRepository } from '../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const siteId = query.site_id as string | undefined
  const location = query.location as string | undefined
  const manufacturer = query.manufacturer as string | undefined
  const role = query.role as string | undefined
  const tag = query.tag as string | undefined
  const isFavorite = query.is_favorite === 'true' ? true : query.is_favorite === 'false' ? false : undefined
  const search = query.search as string | undefined

  const allSwitches = await switchRepository.list()
  let items = [...allSwitches]

  if (siteId) {
    items = items.filter((s) => s.site_id === siteId)
  }

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

  const locations = [...new Set(allSwitches.map(s => s.location).filter(Boolean))].sort() as string[]
  const tags = [...new Set(allSwitches.flatMap(s => s.tags || []))].sort()

  return {
    data: items,
    meta: { total: items.length },
    filters: { locations, tags }
  }
})
