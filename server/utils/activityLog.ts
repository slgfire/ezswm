import type { H3Event } from 'h3'
import { activityRepository } from '../repositories/activityRepository'
import { getAuthContext } from './requireAdmin'

type LogInput = Parameters<typeof activityRepository.log>[0]

/**
 * Event-aware wrapper around activityRepository.log. The authenticated user is the
 * authoritative actor (`user_id` in the input is only a fallback when no auth context
 * exists). API-token requests get metadata `auth_type`, `api_token_id`, `api_token_name`
 * merged over existing metadata; the raw token/hash is never available here or recorded.
 */
export async function logActivity(event: H3Event, input: Omit<LogInput, 'user_id'> & { user_id?: string }) {
  const auth = getAuthContext(event)
  const userId = auth?.userId ?? input.user_id
  if (userId === undefined) throw createError({ statusCode: 401, message: 'Authentication required' })

  const metadata = auth?.authType === 'api_token'
    ? { ...input.metadata, auth_type: 'api_token', api_token_id: auth.apiTokenId, api_token_name: auth.apiTokenName }
    : input.metadata

  return activityRepository.log({ ...input, user_id: userId, ...(metadata ? { metadata } : {}) })
}
