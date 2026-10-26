import { apiTokenRepository } from '../../../repositories/apiTokenRepository'
import { createApiTokenSchema } from '../../../validators/tokenSchemas'
import { requireJwtAuth } from '../../../utils/requireAdmin'

// Self only (local accounts, or OIDC accounts whose validated session is still current). Returns the plaintext token exactly once.
export default defineEventHandler(async (event) => {
  const auth = requireJwtAuth(event)
  const parsed = createApiTokenSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid API token data' })
  }

  const result = await apiTokenRepository.create(auth.userId, parsed.data, auth.oidcSession)
  if (!result.ok) {
    switch (result.reason) {
      case 'duplicate_name':
        throw createError({ statusCode: 409, statusMessage: 'An API token with this name already exists' })
      case 'limit':
        throw createError({ statusCode: 409, statusMessage: 'API token limit reached (maximum 10)' })
      case 'forbidden_owner':
        throw createError({ statusCode: 403, statusMessage: 'API tokens are not available for this session' })
      default:
        throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
  }

  setResponseStatus(event, 201)
  return result.token
})
