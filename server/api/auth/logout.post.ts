import { clearAuthCookie } from '../../utils/auth'

export default defineEventHandler((event) => {
  clearAuthCookie(event)
  return { success: true }
})
