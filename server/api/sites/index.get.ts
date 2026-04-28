import { siteRepository } from '../../repositories/siteRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const search = query.search as string | undefined

  const allSites = siteRepository.list()
  let items = [...allSites]

  if (search) {
    const term = search.toLowerCase()
    items = items.filter((s) => s.name.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term))
  }

  const data = items.map(site => ({
    ...site,
    _counts: siteRepository.getEntityCounts(site.id)
  }))

  return {
    data,
    meta: { total: data.length }
  }
})
