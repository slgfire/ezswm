import { switchGroupRepository } from '../../repositories/switchGroupRepository'
import { resolveSiteIdQuery } from '../../utils/resolveSiteParam'
import { requireSwitchGroupsEnabled } from '../../utils/requireSwitchGroupsEnabled'

export default defineEventHandler(async (event) => {
  await requireSwitchGroupsEnabled()

  const query = getQuery(event)
  const siteId = await resolveSiteIdQuery(query.site_id as string | undefined)
  const search = query.search as string | undefined

  let items = await switchGroupRepository.list()

  if (siteId === null) {
    items = []
  } else if (siteId) {
    items = items.filter(group => group.site_id === siteId)
  }

  if (search) {
    const term = search.toLowerCase()
    items = items.filter(group => group.name.toLowerCase().includes(term))
  }

  return {
    data: items,
    meta: { total: items.length }
  }
})
