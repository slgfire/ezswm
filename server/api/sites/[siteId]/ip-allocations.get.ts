import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../repositories/networkRepository'
import { vlanRepository } from '../../../repositories/vlanRepository'
import { siteRepository } from '../../../repositories/siteRepository'
import { enrichAllocations } from '../../../utils/enrichAllocations'
import { resolveSiteParam } from '../../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const site = await resolveSiteParam(event.context.params?.siteId)

  const allNetworks = await networkRepository.list()
  const networks = site ? allNetworks.filter(n => n.site_id === site.id) : allNetworks

  const data = enrichAllocations(
    await ipAllocationRepository.list(),
    networks,
    await vlanRepository.list(),
    await siteRepository.list()
  )

  return { data, meta: { total: data.length } }
})
