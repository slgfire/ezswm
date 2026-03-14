import { randomUUID } from 'node:crypto'
import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const network = await repositories.networks.findById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  const payload = { ...body, networkId, id: body.id || randomUUID() }
  await repositories.ranges.validate(payload, network)
  return repositories.ranges.create(payload)
})
