import { allocationsRepository } from '~/server/repositories/allocations.repository'
import { networksRepository } from '~/server/repositories/networks.repository'
import { rangesRepository } from '~/server/repositories/ranges.repository'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' })
  let found = false
  await networksRepository.updateAll(items => items.filter(item => { const keep = item.id !== id; if (!keep) found = true; return keep }), event)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  await allocationsRepository.updateAll(items => items.filter(item => item.networkId !== id), event)
  await rangesRepository.updateAll(items => items.filter(item => item.networkId !== id), event)
  return { deleted: true }
})
