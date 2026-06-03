import { userRepository } from '../../repositories/userRepository'

export default defineEventHandler(async (_event) => {
  const users = await userRepository.list()

  return users.map((user) => {
    const { password_hash: _, ...safeUser } = user
    return safeUser
  })
})
