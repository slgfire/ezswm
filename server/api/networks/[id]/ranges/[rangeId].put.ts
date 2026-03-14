import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const networkId = getRouterParam(event, 'id')!
  const rangeId = getRouterParam(event, 'rangeId')!
  const body = await readBody(event)
  const network = await repositories.networks.findById(networkId)
  if (!network) throw createError({ statusCode: 404, statusMessage: 'Network not found' })

  const current = await repositories.ranges.findById(rangeId)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Range not found' })
  const payload = { ...current, ...body, id: rangeId, networkId }
  await repositories.ranges.validate(payload, network, rangeId)
  return repositories.ranges.update(rangeId, body)
})
