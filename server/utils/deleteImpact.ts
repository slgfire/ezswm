import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Shared A5 delete guard (plan A5): fingerprinting plus the preview/400/409 flow
 * used by every API-token-safe delete route. JWT callers skip the precondition.
 */
export function deleteImpactToken(impact: unknown): string {
  return createHash('sha256').update(JSON.stringify(impact)).digest('hex')
}

export type DeleteOutcome<T> =
  | { kind: 'not_found' }
  | { kind: 'conflict', impact: T, impactToken: string }
  | { kind: 'deleted', impact: T }

export type SafeDeleteResult<T> = { kind: 'preview', body: Record<string, unknown> } | { kind: 'deleted', impact: T }

interface SafeDeleteOptions<T> {
  isApiToken: boolean
  notFoundMessage: string
  preview: () => Promise<T | null>
  impactToken: (impact: T) => string
  deleteGuarded: (expectedImpactToken?: string) => Promise<DeleteOutcome<T>>
  /** Extra payload for the preview response (e.g. VLAN conflicts / blocking reasons). */
  describePreview?: (impact: T) => Record<string, unknown>
}

export async function runSafeDelete<T>(event: H3Event, opts: SafeDeleteOptions<T>): Promise<SafeDeleteResult<T>> {
  const query = getQuery(event)
  const confirmed = query.confirm === 'true' || query.confirm === '1'

  if (opts.isApiToken && !confirmed) {
    const impact = await opts.preview()
    if (!impact) throw createError({ statusCode: 404, statusMessage: opts.notFoundMessage })
    return {
      kind: 'preview',
      body: {
        preview: true,
        requiresConfirmation: true,
        message: 'Re-call with confirm=true and the returned impactToken to delete.',
        impactToken: opts.impactToken(impact),
        impact,
        ...(opts.describePreview ? opts.describePreview(impact) : {})
      }
    }
  }

  const expectedImpactToken = typeof query.expectedImpactToken === 'string' ? query.expectedImpactToken : undefined
  if (opts.isApiToken && !expectedImpactToken) {
    throw createError({
      statusCode: 400,
      statusMessage: 'expectedImpactToken is required: preview first, then pass its impactToken with confirm=true'
    })
  }

  const outcome = await opts.deleteGuarded(opts.isApiToken ? expectedImpactToken : undefined)
  if (outcome.kind === 'not_found') throw createError({ statusCode: 404, statusMessage: opts.notFoundMessage })
  if (outcome.kind === 'conflict') {
    throw createError({
      statusCode: 409,
      statusMessage: 'State changed since the preview; re-fetch the impact and confirm again',
      data: { requiresConfirmation: true, impactToken: outcome.impactToken, impact: outcome.impact }
    })
  }
  return { kind: 'deleted', impact: outcome.impact }
}
