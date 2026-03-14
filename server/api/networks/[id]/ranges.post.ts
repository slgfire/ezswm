import { randomUUID } from 'node:crypto'
import { rangeRepository } from '~/server/storage/repositories'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  return rangeRepository.create({ id: randomUUID(), networkId, ...body })
})
