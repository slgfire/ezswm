import { apiTokenRepository } from '../../../repositories/apiTokenRepository'
import { requireJwtAuth } from '../../../utils/requireAdmin'

// Revoke ALL of the caller's own tokens.
export default defineEventHandler(async (event) => {
  const auth = requireJwtAuth(event)
  return { revoked: await apiTokenRepository.deleteAllByUser(auth.userId) }
})
