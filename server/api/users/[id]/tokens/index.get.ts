import { apiTokenRepository } from '../../../../repositories/apiTokenRepository'
import { userRepository } from '../../../../repositories/userRepository'
import { requireAdmin, requireJwtAuth } from '../../../../utils/requireAdmin'

// Admin JWT only: list another user's token metadata.
export default defineEventHandler(async (event) => {
  requireJwtAuth(event)
  requireAdmin(event)
  const id = event.context.params?.id
  if (!id || !(await userRepository.getById(id))) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  return apiTokenRepository.listByUser(id)
})
