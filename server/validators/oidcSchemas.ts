import { z } from 'zod'

/** Scope token per RFC 6749 §3.3 (no spaces, quotes or backslashes). */
const SCOPE_TOKEN_RE = /^[\x21\x23-\x5B\x5D-\x7E]+$/
/** Claim path: letters, digits and a small set of URL/path punctuation. */
const CLAIM_PATH_RE = /^[A-Za-z0-9_\-.:/@#~+]+$/

const groupName = z.string().trim().min(1).max(512)
const groupList = z.array(groupName).max(100).transform(list => [...new Set(list)])

const issuerString = z.string().trim().min(1).max(2048).superRefine((value, ctx) => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Issuer must be an absolute URL' })
    return
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    ctx.addIssue({ code: 'custom', message: 'Issuer must use https (or http when explicitly allowed)' })
  }
  if (url.username || url.password) ctx.addIssue({ code: 'custom', message: 'Issuer must not contain credentials' })
  if (url.hash || value.includes('#')) ctx.addIssue({ code: 'custom', message: 'Issuer must not contain a fragment' })
  if (url.search || value.includes('?')) ctx.addIssue({ code: 'custom', message: 'Issuer must not contain a query' })
  if (/\s/.test(value)) ctx.addIssue({ code: 'custom', message: 'Issuer must not contain whitespace' })
})

const scopesSchema = z.array(z.string().trim().min(1).max(128).regex(SCOPE_TOKEN_RE, 'Invalid scope token'))
  .max(20)
  .transform(list => [...new Set(list)])
  .refine(list => list.length > 0, 'At least one scope is required')
  .transform(list => (list.includes('openid') ? list : ['openid', ...list]))

/** Optional plain-text provider display name: trimmed, max 64, no ASCII control chars; blank -> null. */
export const providerNameSchema = z.string().trim().max(64)
  // eslint-disable-next-line no-control-regex
  .refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Provider name must not contain control characters')
  .transform(value => (value.length === 0 ? null : value))
  .nullable()

export const oidcConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  issuer: issuerString.nullable().optional(),
  client_id: z.string().trim().min(1).max(512).nullable().optional(),
  client_secret: z.string().min(1).max(4096).optional(),
  client_secret_clear: z.boolean().optional(),
  scopes: scopesSchema.optional(),
  groups_claim: z.string().trim().min(1).max(200).regex(CLAIM_PATH_RE, 'Invalid claim name').optional(),
  admin_groups: groupList.optional(),
  viewer_groups: groupList.optional(),
  allow_unmatched_viewer: z.boolean().optional(),
  allow_http_issuer: z.boolean().optional(),
  provider_name: providerNameSchema.optional()
}).strict().superRefine((value, ctx) => {
  if (value.client_secret !== undefined && value.client_secret_clear === true) {
    ctx.addIssue({ code: 'custom', path: ['client_secret_clear'], message: 'Cannot set and clear the client secret at once' })
  }
  if (value.issuer && value.allow_http_issuer === false && value.issuer.startsWith('http:')) {
    ctx.addIssue({ code: 'custom', path: ['issuer'], message: 'http issuers require allow_http_issuer' })
  }
})

export type OidcConfigUpdate = z.infer<typeof oidcConfigUpdateSchema>

/** Safe return_to: same-origin relative path only. */
export function sanitizeReturnTo(value: unknown): string {
  if (typeof value !== 'string') return '/'
  if (value.length === 0 || value.length > 512) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return '/'
  if (value.startsWith('/api/') || value.startsWith('/login')) return '/'
  return value
}

export const oidcStartQuerySchema = z.object({
  return_to: z.string().max(512).optional()
})

/** Callback query as delivered by the IdP. Unknown params are ignored. */
export const oidcCallbackQuerySchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  state: z.string().min(1).max(512).optional(),
  error: z.string().max(128).optional(),
  error_description: z.string().max(1024).optional(),
  iss: z.string().max(2048).optional()
})
