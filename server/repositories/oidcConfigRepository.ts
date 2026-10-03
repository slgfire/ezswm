import { prisma } from '../db/client'
import type { OidcConfigRecord } from '../../types/oidc'
import { mergeObservedGroups, sanitizeObservedGroups } from '../utils/oidc/claims'

const SINGLETON_ID = 'singleton'

interface OidcConfigRow {
  enabled: boolean
  issuer: string | null
  client_id: string | null
  client_secret_ciphertext: string | null
  scopes: string
  groups_claim: string
  admin_groups: string
  viewer_groups: string
  allow_unmatched_viewer: boolean
  allow_http_issuer: boolean
  observed_groups: string
  provider_name: string | null
  config_revision: number
  updated_at: string
}

const DEFAULTS: OidcConfigRecord = {
  enabled: false,
  issuer: null,
  client_id: null,
  client_secret_ciphertext: null,
  scopes: ['openid', 'profile'],
  groups_claim: 'groups',
  admin_groups: [],
  viewer_groups: [],
  allow_unmatched_viewer: false,
  allow_http_issuer: false,
  observed_groups: [],
  provider_name: null,
  config_revision: 0,
  updated_at: ''
}

function parseStringArray(raw: string, fallback: string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) return parsed as string[]
  } catch {
    // fall through
  }
  return [...fallback]
}

function rowToRecord(row: OidcConfigRow): OidcConfigRecord {
  return {
    enabled: row.enabled,
    issuer: row.issuer,
    client_id: row.client_id,
    client_secret_ciphertext: row.client_secret_ciphertext,
    scopes: parseStringArray(row.scopes, DEFAULTS.scopes),
    groups_claim: row.groups_claim,
    admin_groups: parseStringArray(row.admin_groups, []),
    viewer_groups: parseStringArray(row.viewer_groups, []),
    allow_unmatched_viewer: row.allow_unmatched_viewer,
    allow_http_issuer: row.allow_http_issuer,
    observed_groups: sanitizeObservedGroups(parseStringArray(row.observed_groups, [])),
    provider_name: row.provider_name,
    config_revision: row.config_revision,
    updated_at: row.updated_at
  }
}

/**
 * Policy/credential fields. `client_secret_ciphertext`: `undefined` retains the
 * stored value, `null` clears it, a string replaces it (already encrypted by the caller).
 */
export interface OidcConfigPatch {
  enabled?: boolean
  issuer?: string | null
  client_id?: string | null
  client_secret_ciphertext?: string | null
  scopes?: string[]
  groups_claim?: string
  admin_groups?: string[]
  viewer_groups?: string[]
  allow_unmatched_viewer?: boolean
  allow_http_issuer?: boolean
  /** Cosmetic branding: `undefined` retains, `null` clears. Never bumps the revision. */
  provider_name?: string | null
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function computeNext(current: OidcConfigRecord, patch: OidcConfigPatch): { next: OidcConfigRecord, changed: boolean, securityChanged: boolean } {
  const next: OidcConfigRecord = { ...current }
  let changed = false

  const setScalar = <K extends 'enabled' | 'issuer' | 'client_id' | 'groups_claim' | 'allow_unmatched_viewer' | 'allow_http_issuer'>(key: K, value: OidcConfigRecord[K] | undefined) => {
    if (value !== undefined && value !== current[key]) {
      next[key] = value
      changed = true
    }
  }
  const setList = <K extends 'scopes' | 'admin_groups' | 'viewer_groups'>(key: K, value: string[] | undefined) => {
    if (value !== undefined && !sameList(value, current[key])) {
      next[key] = [...value]
      changed = true
    }
  }

  setScalar('enabled', patch.enabled)
  setScalar('issuer', patch.issuer)
  setScalar('client_id', patch.client_id)
  setScalar('groups_claim', patch.groups_claim)
  setScalar('allow_unmatched_viewer', patch.allow_unmatched_viewer)
  setScalar('allow_http_issuer', patch.allow_http_issuer)
  setList('scopes', patch.scopes)
  setList('admin_groups', patch.admin_groups)
  setList('viewer_groups', patch.viewer_groups)

  if (patch.client_secret_ciphertext !== undefined) {
    // A fresh ciphertext is always a change (random IV); clearing an absent secret is not.
    if (patch.client_secret_ciphertext === null) {
      if (current.client_secret_ciphertext !== null) {
        next.client_secret_ciphertext = null
        changed = true
      }
    } else {
      next.client_secret_ciphertext = patch.client_secret_ciphertext
      changed = true
    }
  }
  const securityChanged = changed

  // Cosmetic only: stored name + updated_at, no revision bump / transaction purge.
  if (patch.provider_name !== undefined && patch.provider_name !== current.provider_name) {
    next.provider_name = patch.provider_name
    changed = true
  }
  return { next, changed, securityChanged }
}

export const oidcConfigRepository = {
  /** Returns defaults (disabled) when nothing has been saved yet; does not write. */
  async get(): Promise<OidcConfigRecord> {
    const row = await prisma.oidcConfig.findUnique({ where: { id: SINGLETON_ID } })
    return row ? rowToRecord(row) : { ...DEFAULTS, scopes: [...DEFAULTS.scopes] }
  },

  /**
   * Apply a patch atomically. Every actual policy/credential change bumps
   * `config_revision` and deletes ALL in-flight login transactions in the same
   * DB transaction. A provider_name-only change (cosmetic) updates the name and
   * `updated_at` only (changed: true, revision/transactions untouched). No-op patches
   * leave everything untouched.
   */
  async update(patch: OidcConfigPatch): Promise<{ config: OidcConfigRecord, changed: boolean }> {
    return prisma.$transaction(async (tx) => {
      const row = await tx.oidcConfig.findUnique({ where: { id: SINGLETON_ID } })
      const current = row ? rowToRecord(row) : { ...DEFAULTS, scopes: [...DEFAULTS.scopes] }
      const { next, changed, securityChanged } = computeNext(current, patch)
      if (!changed) return { config: current, changed: false }

      const data = {
        enabled: next.enabled,
        issuer: next.issuer,
        client_id: next.client_id,
        client_secret_ciphertext: next.client_secret_ciphertext,
        scopes: JSON.stringify(next.scopes),
        groups_claim: next.groups_claim,
        admin_groups: JSON.stringify(next.admin_groups),
        viewer_groups: JSON.stringify(next.viewer_groups),
        allow_unmatched_viewer: next.allow_unmatched_viewer,
        allow_http_issuer: next.allow_http_issuer,
        provider_name: next.provider_name,
        config_revision: securityChanged ? current.config_revision + 1 : current.config_revision,
        updated_at: new Date().toISOString()
      }
      const saved = await tx.oidcConfig.upsert({
        where: { id: SINGLETON_ID },
        create: { id: SINGLETON_ID, observed_groups: JSON.stringify(current.observed_groups), ...data },
        update: data
      })
      if (securityChanged) await tx.oidcLoginTxn.deleteMany({})
      return { config: rowToRecord(saved), changed: true }
    })
  },

  /**
   * Record groups seen on a SUCCESSFUL login (suggestions only, bounded, sanitized).
   * Does not change the revision and never grants anything.
   */
  async recordObservedGroups(groups: readonly string[]): Promise<string[]> {
    return prisma.$transaction(async (tx) => {
      const row = await tx.oidcConfig.findUnique({ where: { id: SINGLETON_ID } })
      if (!row) return []
      const merged = mergeObservedGroups(parseStringArray(row.observed_groups, []), groups)
      await tx.oidcConfig.update({ where: { id: SINGLETON_ID }, data: { observed_groups: JSON.stringify(merged) } })
      return merged
    })
  }
}
