import { topologyLayoutRepository } from '../../../repositories/topologyLayoutRepository'
import { switchRepository } from '../../../repositories/switchRepository'
import { saveLayoutSchema } from '../../../validators/topologySchemas'
import { resolveSiteParam } from '../../../utils/resolveSiteParam'

export default defineEventHandler(async (event) => {
  const site = await resolveSiteParam(event.context.params?.siteId)
  if (!site) {
    throw createError({ statusCode: 400, statusMessage: 'Topology layout is not available for the "all" view' })
  }

  const body = await readBody(event)
  const parsed = saveLayoutSchema.parse(body)

  // Ownership check: all node IDs must belong to switches in this site
  const siteSwitches = (await switchRepository.list()).filter(sw => sw.site_id === site.id)
  const validIds = new Set(siteSwitches.map(sw => sw.id))

  const filteredPositions: Record<string, { x: number; y: number }> = {}
  for (const [nodeId, pos] of Object.entries(parsed.node_positions)) {
    if (validIds.has(nodeId)) {
      filteredPositions[nodeId] = pos
    }
  }

  const layout = await topologyLayoutRepository.save(site.id, filteredPositions)
  return layout
})
