import { userRepository } from '../../repositories/userRepository'
import { createUserSchema } from '../../validators/userSchemas'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = createUserSchema.parse(body)

  const hashedPassword = await hashPassword(validated.password)

  const user = userRepository.create({
    ...validated,
    password_hash: hashedPassword,
  })

  const { password_hash: _, ...safeUser } = user

  setResponseStatus(event, 201)
  return safeUser
})
