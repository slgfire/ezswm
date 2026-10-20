import { apiTokenRepository } from '../../../repositories/apiTokenRepository'
import { requireJwtAuth } from '../../../utils/requireAdmin'

// Self only: always the caller's own tokens (metadata only, never secret/hash).
export default defineEventHandler(async (event) => {
  const auth = requireJwtAuth(event)
  return apiTokenRepository.listByUser(auth.userId)
})
