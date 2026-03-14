import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const updated = await networkRepository.updateAllocation(getRouterParam(event, 'id') || '', await readBody(event))
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Allocation not found' })
  return updated
})
