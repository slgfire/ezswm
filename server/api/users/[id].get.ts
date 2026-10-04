import { userRepository } from '../../repositories/userRepository'
import { getAuthContext } from '../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const auth = getAuthContext(event)
  if (auth && auth.role !== 'admin' && auth.userId !== id) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const user = await userRepository.getById(id)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const { password_hash: _, ...safeUser } = user
  return safeUser
})
