import { userRepository } from '../../repositories/userRepository'
import { updateProfileSchema, updateUserSchema } from '../../validators/userSchemas'
import { getAuthContext } from '../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const auth = getAuthContext(event)
  if (!auth) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const existing = await userRepository.getById(id)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const body = await readBody(event)

  let updated
  if (auth.role === 'admin') {
    // Admins may edit role too; the repository refuses manual changes to OIDC-managed
    // fields (409) and demoting the last local administrator (409).
    const validated = updateUserSchema.parse(body)
    updated = await userRepository.update(id, validated)
  } else {
    // Non-admins: self only (middleware enforces too) and strictly display_name/language.
    if (auth.userId !== id) {
      throw createError({ statusCode: 403, message: 'Insufficient permissions' })
    }
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({ statusCode: 400, message: 'Only display_name and language can be changed' })
    }
    updated = await userRepository.updateProfile(id, parsed.data)
  }

  const { password_hash: _, ...safeUser } = updated
  return safeUser
})
