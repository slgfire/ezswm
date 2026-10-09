export type PortConflictScope = 'lag' | 'port'

export type PortConflictMessageKey =
  | 'switches.ports.switchModified'
  | 'switches.ports.assignmentConflict'
  | 'lag.memberResetForbidden'
  | 'lag.assignmentConflict'

type ConflictError = {
  statusCode?: number
  status?: number
  statusMessage?: string
  message?: string
  data?: {
    reason?: string
    message?: string
    statusMessage?: string
    data?: { reason?: string; message?: string; statusMessage?: string }
  }
}

/** Maps only known 409 contracts to user-facing copy; never displays raw server text. */
export function portConflictMessageKey(error: unknown, scope: PortConflictScope): PortConflictMessageKey | null {
  if (!error || typeof error !== 'object') return null

  const value = error as ConflictError
  if ((value.statusCode ?? value.status) !== 409) return null

  const reason = value.data?.reason ?? value.data?.data?.reason
  if (reason === 'lag_member_reset_forbidden') return 'lag.memberResetForbidden'

  const messages = [
    value.statusMessage,
    value.data?.statusMessage,
    value.data?.message,
    value.data?.data?.statusMessage,
    value.data?.data?.message,
    value.message
  ]
  if (messages.includes('Switch was modified since page load')) return 'switches.ports.switchModified'

  return scope === 'lag' ? 'lag.assignmentConflict' : 'switches.ports.assignmentConflict'
}
