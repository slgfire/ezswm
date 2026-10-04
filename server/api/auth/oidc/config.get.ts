import { oidcConfigRepository } from '../../../repositories/oidcConfigRepository'
import { buildOidcConfigDto, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import { getRequestOrigin } from '../../../utils/auth'
import { requireAdmin } from '../../../utils/requireAdmin'

// Admin only. Returns the safe DTO: never the secret, ciphertext or key.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const record = await oidcConfigRepository.get()
  return buildOidcConfigDto(record, readOidcRuntimeSettings(), getRequestOrigin(event))
})
