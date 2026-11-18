import { settingsRepository } from '../../repositories/settingsRepository'
import { userRepository } from '../../repositories/userRepository'
import { setupSchema } from '../../validators/userSchemas'
import { hashPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  if ((await settingsRepository.get()).setup_completed) {
    throw createError({ statusCode: 403, message: 'Setup has already been completed' })
  }

  const body = await readBody(event)
  const validated = setupSchema.parse(body)

  const passwordHash = await hashPassword(validated.password)

  const user = await userRepository.bootstrap({
    username: validated.username,
    display_name: validated.display_name,
    password_hash: passwordHash,
    language: validated.language
  })

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role
  })

  setAuthCookie(event, token)

  const { password_hash: _, ...safeUser } = user
  return { user: safeUser, token }
})
