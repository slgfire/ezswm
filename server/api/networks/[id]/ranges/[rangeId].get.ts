import { ipRangeRepository } from '../../../../repositories/ipRangeRepository'

export default defineEventHandler(async (event) => {
  const rangeId = event.context.params?.rangeId

  if (!rangeId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing range ID' })
  }

  const range = ipRangeRepository.getById(rangeId)

  if (!range) {
    throw createError({ statusCode: 404, statusMessage: 'IP range not found' })
  }

  return range
})
