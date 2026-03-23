import { userRepository } from '../../repositories/userRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const user = userRepository.getById(id)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const { password_hash: _, ...safeUser } = user
  return safeUser
})
