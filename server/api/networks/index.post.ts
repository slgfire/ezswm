import type { Network } from '~/types/models'
import { useStorage } from '~/server/storage'
import { normalizeNetworkPayload, validateNetworkPayload } from './_shared/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Network>>(event)
  validateNetworkPayload(body)

  const storage = useStorage()
  const created = await storage.networks.create(normalizeNetworkPayload(body))
  return created
})
