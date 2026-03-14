import { createError } from 'h3'
import { allocationRepository, networkRepository, rangeRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const network = await networkRepository.findById(id)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  const allocations = (await allocationRepository.getAll()).filter(item => item.networkId === id)
  const ranges = (await rangeRepository.getAll()).filter(item => item.networkId === id)
  return { ...network, allocations, ranges }
})
