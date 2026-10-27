import { apiTokenRepository } from '../../../repositories/apiTokenRepository'
import { requireJwtAuth } from '../../../utils/requireAdmin'

// Foreign/unknown ids are 404 for everyone, including admins.
export default defineEventHandler(async (event) => {
  const auth = requireJwtAuth(event)
  const id = event.context.params?.id
  if (!id || !(await apiTokenRepository.deleteOwned(auth.userId, id))) {
    throw createError({ statusCode: 404, statusMessage: 'API token not found' })
  }
  setResponseStatus(event, 204)
  return null
})
