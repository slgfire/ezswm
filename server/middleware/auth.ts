import { getTokenFromEvent, verifyToken } from '../utils/auth'

const PUBLIC_PATHS = [
  '/api/auth/setup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health'
]

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const method = getMethod(event)

  // Only apply to API routes
  if (!path.startsWith('/api/')) return

  // Public API routes with dynamic segments
  if (path.startsWith('/api/p/')) return

  // Nuxt internal APIs (icons, etc.)
  if (path.startsWith('/api/_')) return

  // Skip public paths
  if (PUBLIC_PATHS.some(p => path === p)) return

  // Allow GET /api/settings (for setup check)
  if (path === '/api/settings' && method === 'GET') return

  const token = getTokenFromEvent(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  try {
    const payload = verifyToken(token)
    event.context.auth = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role
    }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }
})
