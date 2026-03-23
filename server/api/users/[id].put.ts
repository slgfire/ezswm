import { userRepository } from '../../repositories/userRepository'
import { updateUserSchema } from '../../validators/userSchemas'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const existing = userRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const body = await readBody(event)
  const validated = updateUserSchema.parse(body)

  const updated = userRepository.update(id, validated)

  const { password_hash: _, ...safeUser } = updated
  return safeUser
})
