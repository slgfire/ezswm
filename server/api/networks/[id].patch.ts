import { createError } from 'h3'
import { networkRepository } from '~/server/storage/repositories'
import { prefixToNetmask } from '~/utils/ip'
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  if (body.prefix !== undefined) body.netmask = prefixToNetmask(Number(body.prefix))
  const updated = await networkRepository.update(id, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Network not found' })
  return updated
})
