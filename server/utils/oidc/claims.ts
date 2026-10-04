import { createHash } from 'node:crypto'
import type { OidcAccessDecision, OidcGroupsStatus, OidcRoleRules } from '../../../types/oidc'

/** Pure claim → group → role mapping. No I/O, no framework globals. */

export const MAX_GROUPS_PER_TOKEN = 500
export const MAX_GROUP_LENGTH = 512
export const MAX_OBSERVED_GROUPS = 50
export const MAX_OBSERVED_GROUP_LENGTH = 128

type Claims = Record<string, unknown>

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

function isPlainObject(value: unknown): value is Claims {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/**
 * Resolve a claim by name. An exact top-level key (e.g. the namespaced claim
 * `https://example.com/groups`) wins; otherwise the name is treated as a dot
 * path (`realm_access.roles`). Only own properties are traversed; prototype
 * segments are rejected.
 */
export function readClaimPath(claims: Claims, path: string): { found: boolean, value?: unknown, unsafe?: boolean } {
  if (hasOwn(claims, path)) return { found: true, value: claims[path] }
  const segments = path.split('.')
  if (segments.some(s => s === '' || FORBIDDEN_SEGMENTS.has(s))) return { found: false, unsafe: true }
  let current: unknown = claims
  for (const seg of segments) {
    if (!isPlainObject(current) || !hasOwn(current, seg)) return { found: false }
    current = current[seg]
  }
  return { found: true, value: current }
}

function indicatesOverage(claims: Claims, groupsClaim: string): boolean {
  if (claims.hasgroups === true || claims.hasgroups === 'true') return true
  const names = claims._claim_names
  if (isPlainObject(names)) {
    // Only distributed claims that reference the groups claim count; unrelated ones are ignored.
    if (hasOwn(names, 'groups') || hasOwn(names, groupsClaim)) return true
    const top = groupsClaim.split('.')[0]!
    if (top && hasOwn(names, top)) return true
  }
  return false
}

export function extractGroups(claims: Claims, groupsClaim: string): OidcGroupsStatus {
  if (indicatesOverage(claims, groupsClaim)) return { status: 'overage' }

  const read = readClaimPath(claims, groupsClaim)
  if (read.unsafe) return { status: 'malformed', reason: 'unsafe_claim_path' }
  if (!read.found || read.value === undefined) return { status: 'missing' }

  const value = read.value
  if (!Array.isArray(value)) return { status: 'malformed', reason: 'not_an_array' }
  if (value.length > MAX_GROUPS_PER_TOKEN) return { status: 'malformed', reason: 'too_many_groups' }

  const groups: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return { status: 'malformed', reason: 'non_string_entry' }
    if (item.length === 0 || item.length > MAX_GROUP_LENGTH) return { status: 'malformed', reason: 'invalid_entry_length' }
    groups.push(item)
  }
  return { status: 'ok', groups: [...new Set(groups)] }
}

/**
 * Combine ID token and (optional) UserInfo claims. UserInfo is consulted ONLY when
 * the ID token has no groups claim at all; malformed/overage in the ID token is
 * denied regardless of any UserInfo fallback. The caller must have verified that
 * the UserInfo `sub` equals the validated ID token `sub`.
 */
export function resolveGroups(
  idTokenClaims: Claims,
  groupsClaim: string,
  userInfoClaims?: Claims | null
): OidcGroupsStatus {
  const fromIdToken = extractGroups(idTokenClaims, groupsClaim)
  if (fromIdToken.status !== 'missing') return fromIdToken
  if (!userInfoClaims) return fromIdToken
  return extractGroups(userInfoClaims, groupsClaim)
}

/** True when the ID token has no groups at all, i.e. a UserInfo lookup is warranted. */
export function needsUserInfoForGroups(idTokenClaims: Claims, groupsClaim: string): boolean {
  return extractGroups(idTokenClaims, groupsClaim).status === 'missing'
}

export function decideOidcAccess(status: OidcGroupsStatus, rules: OidcRoleRules): OidcAccessDecision {
  if (status.status === 'overage') return { ok: false, reason: 'groups_overage' }
  if (status.status === 'malformed') return { ok: false, reason: 'groups_malformed' }

  const groups = status.status === 'ok' ? status.groups : []
  const set = new Set(groups)
  if (rules.adminGroups.some(g => set.has(g))) return { ok: true, role: 'admin', groups }
  if (rules.viewerGroups.some(g => set.has(g))) return { ok: true, role: 'viewer', groups }
  if (rules.allowUnmatchedViewer) return { ok: true, role: 'viewer', groups }
  return { ok: false, reason: status.status === 'missing' ? 'groups_missing' : 'no_matching_group' }
}

const PRINTABLE_RE = /^[^\p{Cc}\p{Cf}\u2028\u2029]+$/u

/** Sanitize groups for the "observed groups" suggestion list (display only, never grants). */
export function sanitizeObservedGroups(groups: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of groups) {
    if (typeof raw !== 'string') continue
    const g = raw.trim()
    if (!g || g.length > MAX_OBSERVED_GROUP_LENGTH || !PRINTABLE_RE.test(g)) continue
    if (!out.includes(g)) out.push(g)
  }
  return out
}

/** Merge newly observed groups into the bounded list (most recent kept, max 50). */
export function mergeObservedGroups(existing: readonly string[], incoming: readonly string[]): string[] {
  const clean = sanitizeObservedGroups(incoming)
  const kept = sanitizeObservedGroups(existing).filter(g => !clean.includes(g))
  return [...kept, ...clean].slice(-MAX_OBSERVED_GROUPS)
}

/** Deterministic local username for an OIDC identity: `oidc_<hex>` (3–50 chars, [A-Za-z0-9_]). */
export function deriveOidcUsername(issuer: string, subject: string, attempt = 0): string {
  const hex = createHash('sha256').update(`${issuer}\u0000${subject}`, 'utf8').digest('hex')
  const len = Math.min(24 + attempt * 4, 44)
  return `oidc_${hex.slice(0, len)}`
}

/** Display name fallback chain; email is used as TEXT only, never to link accounts. */
export function deriveDisplayName(claims: Claims, fallback: string): string {
  for (const key of ['name', 'preferred_username', 'email']) {
    const v = claims[key]
    if (typeof v === 'string') {
      // eslint-disable-next-line no-control-regex
      const t = v.replace(/[\u0000-\u001f\u007f]/g, '').trim()
      if (t) return t.slice(0, 100)
    }
  }
  return fallback.slice(0, 100)
}
