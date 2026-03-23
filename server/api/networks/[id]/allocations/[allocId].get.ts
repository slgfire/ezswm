import { ipAllocationRepository } from '../../../../repositories/ipAllocationRepository'

export default defineEventHandler(async (event) => {
  const allocId = event.context.params?.allocId

  if (!allocId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing allocation ID' })
  }

  const allocation = ipAllocationRepository.getById(allocId)

  if (!allocation) {
    throw createError({ statusCode: 404, statusMessage: 'IP allocation not found' })
  }

  return allocation
})
