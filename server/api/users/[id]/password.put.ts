import { userRepository } from '../../../repositories/userRepository'
import { changePasswordSchema } from '../../../validators/userSchemas'
import { hashPassword, verifyPassword } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const user = userRepository.getById(id)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const body = await readBody(event)
  const validated = changePasswordSchema.parse(body)

  const isValid = await verifyPassword(validated.current_password, user.password_hash)

  if (!isValid) {
    throw createError({ statusCode: 400, message: 'Current password is incorrect' })
  }

  const hashedPassword = await hashPassword(validated.new_password)

  userRepository.update(id, { password_hash: hashedPassword })

  return { message: 'Password changed successfully' }
})
