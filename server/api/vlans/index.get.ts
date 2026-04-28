import { vlanRepository } from '../../repositories/vlanRepository'
import { networkRepository } from '../../repositories/networkRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const siteId = query.site_id as string | undefined
  const status = query.status as string | undefined
  const search = query.search as string | undefined

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
  const data = items.map((v) => ({
    ...v,
    network_count: networks.filter((n) => n.vlan_id === v.id).length,
  }))

  return {
    data,
    meta: { total: data.length },
  }
})
