import type { Network } from '~/types/models'
import { useStorage } from '~/server/storage'
import { normalizeNetworkPayload, validateNetworkPayload } from './_shared/validation'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Network ID is required.' })

  const body = await readBody<Partial<Network>>(event)
  validateNetworkPayload(body)

  const storage = useStorage()
  const updated = await storage.networks.update(id, normalizeNetworkPayload(body))
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Network not found.' })

  return updated
})
