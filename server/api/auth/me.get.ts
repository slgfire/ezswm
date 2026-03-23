import { userRepository } from '../../repositories/userRepository'

export default defineEventHandler((event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const user = userRepository.getById(auth.userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const { password_hash: _, ...safeUser } = user
  return safeUser
})
