import { ipAllocationRepository } from '../../../repositories/ipAllocationRepository'
import { networkRepository } from '../../../repositories/networkRepository'
import { vlanRepository } from '../../../repositories/vlanRepository'
import { siteRepository } from '../../../repositories/siteRepository'
import { enrichAllocations } from '../../../utils/enrichAllocations'

export default defineEventHandler(async (event) => {
  const siteId = event.context.params?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  const allNetworks = await networkRepository.list()
  let networks = allNetworks
  if (siteId !== 'all') {
    if (!(await siteRepository.getById(siteId))) {
      throw createError({ statusCode: 404, statusMessage: 'Site not found' })
    }
    networks = allNetworks.filter(n => n.site_id === siteId)
  }

  const data = enrichAllocations(
    await ipAllocationRepository.list(),
    networks,
    await vlanRepository.list(),
    await siteRepository.list()
  )

  return { data, meta: { total: data.length } }
})
