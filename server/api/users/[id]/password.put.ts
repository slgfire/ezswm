import { userRepository } from '../../../repositories/userRepository'
import { changePasswordSchema } from '../../../validators/userSchemas'
import { hashPassword, verifyPassword } from '../../../utils/auth'
import { getAuthContext } from '../../../utils/requireAdmin'

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

  if (user.auth_provider !== 'local' || !user.password_hash) {
    throw createError({ statusCode: 403, message: 'Password is managed by the external identity provider' })
  }

  const body = await readBody(event)
  const validated = changePasswordSchema.parse(body)

  const isValid = await verifyPassword(validated.current_password, user.password_hash)

  if (!isValid) {
    throw createError({ statusCode: 400, message: 'Current password is incorrect' })
  }

  const hashedPassword = await hashPassword(validated.new_password)

  await userRepository.update(id, { password_hash: hashedPassword })

  return { message: 'Password changed successfully' }
})
