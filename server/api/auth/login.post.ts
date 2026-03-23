import { userRepository } from '../../repositories/userRepository'
import { loginSchema } from '../../validators/userSchemas'
import { verifyPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = loginSchema.parse(body)

  const user = userRepository.getByUsername(validated.username)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  const valid = await verifyPassword(validated.password, user.password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  const token = signToken(
    { sub: user.id, username: user.username, role: user.role },
    validated.remember_me
  )

  setAuthCookie(event, token, validated.remember_me)

  const { password_hash: _, ...safeUser } = user
  return { user: safeUser, token }
})
