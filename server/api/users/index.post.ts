import { userRepository, type CreateLocalUserInput } from '../../repositories/userRepository'
import { createUserSchema } from '../../validators/userSchemas'
import { hashPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    // Generic, non-secret message: never echo the submitted body, password or Zod issues.
    throw createError({ statusCode: 400, statusMessage: 'Invalid user data' })
  }
  const validated = parsed.data

  const hashedPassword = await hashPassword(validated.password)

  // Manual creation only ever yields LOCAL password users (never OIDC identities).
  const input: CreateLocalUserInput = {
    username: validated.username,
    display_name: validated.display_name,
    role: validated.role,
    language: validated.language,
    is_setup_user: false,
    password_hash: hashedPassword
  }
  const user = await userRepository.create(input)

  const { password_hash: _, ...safeUser } = user

  setResponseStatus(event, 201)
  return safeUser
})
