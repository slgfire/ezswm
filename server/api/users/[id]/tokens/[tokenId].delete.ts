import { apiTokenRepository } from '../../../../repositories/apiTokenRepository'
import { requireAdmin, requireJwtAuth } from '../../../../utils/requireAdmin'

// Admin JWT only: revoke a token that belongs to :id; a mismatched tokenId is 404.
export default defineEventHandler(async (event) => {
  requireJwtAuth(event)
  requireAdmin(event)
  const { id, tokenId } = event.context.params ?? {}
  if (!id || !tokenId || !(await apiTokenRepository.deleteOwned(id, tokenId))) {
    throw createError({ statusCode: 404, statusMessage: 'API token not found' })
  }
  setResponseStatus(event, 204)
  return null
})
