import { networkRepository } from '../../repositories/networkRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const siteId = await resolveSiteIdQuery(query.site_id as string | undefined)
  const vlanId = query.vlan_id as string | undefined
  const search = query.search as string | undefined

  let items = await networkRepository.list()

  if (siteId === null) {
    items = []
  } else if (siteId) {
    items = items.filter((n) => n.site_id === siteId)
  }

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

  return {
    data: items,
    meta: { total: items.length },
  }
})
