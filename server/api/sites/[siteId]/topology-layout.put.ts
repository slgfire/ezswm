import { topologyLayoutRepository } from '../../../repositories/topologyLayoutRepository'
import { siteRepository } from '../../../repositories/siteRepository'
import { switchRepository } from '../../../repositories/switchRepository'
import { saveLayoutSchema } from '../../../validators/topologySchemas'

export default defineEventHandler(async (event) => {
  const siteId = event.context.params?.siteId
  if (!siteId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing site ID' })
  }

  if (!siteRepository.getById(siteId)) {
    throw createError({ statusCode: 404, statusMessage: 'Site not found' })
  }

  const body = await readBody(event)
  const parsed = saveLayoutSchema.parse(body)

  // Ownership check: all node IDs must belong to switches in this site
  const siteSwitches = switchRepository.list().filter(sw => sw.site_id === siteId)
  const validIds = new Set(siteSwitches.map(sw => sw.id))

  const filteredPositions: Record<string, { x: number; y: number }> = {}
  for (const [nodeId, pos] of Object.entries(parsed.node_positions)) {
    if (validIds.has(nodeId)) {
      filteredPositions[nodeId] = pos
    }
  }

  const layout = topologyLayoutRepository.save(siteId, filteredPositions)
  return layout
})
