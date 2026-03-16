import { settingsRepository } from '../../repositories/settingsRepository'
import { userRepository } from '../../repositories/userRepository'
import { setupSchema } from '../../validators/userSchemas'
import { hashPassword, signToken, setAuthCookie } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const settings = settingsRepository.get()
  if (settings.setup_completed) {
    throw createError({ statusCode: 403, message: 'Setup has already been completed' })
  }

  const body = await readBody(event)
  const validated = setupSchema.parse(body)

  const passwordHash = await hashPassword(validated.password)

  const user = userRepository.create({
    username: validated.username,
    display_name: validated.display_name,
    password_hash: passwordHash,
    role: 'admin',
    language: validated.language,
    is_setup_user: true
  })

  settingsRepository.update({ setup_completed: true })

  const token = signToken({
    sub: user.id,
    username: user.username,
    role: user.role
  })

  setAuthCookie(event, token)

  const { password_hash: _, ...safeUser } = user
  return { user: safeUser, token }
})
