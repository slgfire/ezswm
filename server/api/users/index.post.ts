import { userRepository } from '../../repositories/userRepository'
import { createUserSchema } from '../../validators/userSchemas'
import { hashPassword } from '../../utils/auth'
import type { User } from '../../../types/user'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createUserSchema.parse(body)

  const hashedPassword = await hashPassword(validated.password)

  const { password: _pw, ...userData } = validated
  const user = userRepository.create({
    ...userData,
    password_hash: hashedPassword,
  } as Omit<User, 'id' | 'created_at' | 'updated_at'>)

  const { password_hash: _, ...safeUser } = user

  setResponseStatus(event, 201)
  return safeUser
})
