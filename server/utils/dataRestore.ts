import type { PrismaClient } from '@prisma/client'
import { canDecryptOidcSecret } from './oidc/crypto'
import { providerNameSchema } from '../validators/oidcSchemas'

// Tables that hold a singleton row (AppSettings), or that are root parents in
// the FK graph. Everything else cascades from these.
const REVERSE_FK_DELETE_ORDER = [
  'activityEntry',
  'topologyLayout',
  'publicToken',
  'port',
  'lagGroup',
  'ipAllocation',
  'ipRange',
  'network',
  'vlan',
  'switch',
  'switchGroup',
  'layoutTemplate',
  'appSettings',
  'oidcLoginTxn', // server-only; always purged, never restored
  'oidcConfig', // re-created explicitly (revision must stay monotonic)
  'user',
  'site'
] as const

// Forward (parent → child) order for inserts.
const FK_INSERT_ORDER = [
  ['users', 'user'],
  ['settings', 'appSettings'],
  ['sites', 'site'],
  ['layoutTemplates', 'layoutTemplate'],
  ['switchGroups', 'switchGroup'],
  ['switches', 'switch'],
  ['vlans', 'vlan'],
  ['networks', 'network'],
  ['ipAllocations', 'ipAllocation'],
  ['ipRanges', 'ipRange'],
  ['lagGroups', 'lagGroup'],
  ['ports', 'port'],
  ['publicTokens', 'publicToken'],
  ['topologyLayouts', 'topologyLayout'],
  ['activity', 'activityEntry']
] as const

type DataPayload = Record<string, unknown[] | undefined>

export interface RestoreOptions {
  /** Current OIDC encryption key (if usable). Restored ciphertext that it cannot decrypt disables SSO. */
  oidcKey?: Buffer | null
}

export interface RestoreResult {
  inserted: Record<string, number>
  /** True when restored SSO was force-disabled because the secret cannot be decrypted with this instance's key. */
  oidcDisabledUndecryptable: boolean
}

const USER_COLUMNS = [
  'id', 'username', 'display_name', 'password_hash', 'role', 'language', 'is_setup_user',
  'created_at', 'updated_at', 'auth_provider', 'oidc_issuer', 'oidc_subject', 'oidc_session_version'
] as const

function bad(message: string): never {
  throw createError({ statusCode: 400, message })
}

const nonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * Normalize + validate restored users. Legacy backups (no provider columns) become
 * local users. Integrity: local users need a password hash; OIDC users need
 * issuer+subject and must not carry a password hash. The restore must leave a usable
 * local administrator (emergency access), otherwise it is rejected before any write.
 */
function normalizeUsers(rows: unknown[] | undefined): Record<string, unknown>[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    bad('Backup contains no users; restoring it would lock everyone out. A local administrator is required.')
  }
  const out: Record<string, unknown>[] = []
  const identities = new Set<string>()
  let localAdmins = 0
  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') bad(`Row ${i} of user: expected an object.`)
    const r = raw as Record<string, unknown>
    const provider = r.auth_provider === undefined || r.auth_provider === null ? 'local' : r.auth_provider
    if (provider !== 'local' && provider !== 'oidc') bad(`Row ${i} of user: invalid auth_provider.`)
    if (r.role !== 'admin' && r.role !== 'viewer') bad(`Row ${i} of user: invalid role.`)
    const hash = r.password_hash === undefined ? null : r.password_hash
    const issuer = r.oidc_issuer === undefined ? null : r.oidc_issuer
    const subject = r.oidc_subject === undefined ? null : r.oidc_subject
    const version = r.oidc_session_version === undefined || r.oidc_session_version === null ? 0 : r.oidc_session_version
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) bad(`Row ${i} of user: invalid oidc_session_version.`)

    if (provider === 'local') {
      if (!nonEmptyString(hash)) bad(`Row ${i} of user: local users require a password_hash.`)
      if (issuer !== null || subject !== null) bad(`Row ${i} of user: local users must not have an OIDC identity.`)
      if (r.role === 'admin') localAdmins++
    } else {
      if (!nonEmptyString(issuer) || !nonEmptyString(subject)) bad(`Row ${i} of user: OIDC users require oidc_issuer and oidc_subject.`)
      if (hash !== null) bad(`Row ${i} of user: OIDC users must not have a password_hash.`)
      const key = `${issuer}\u0000${subject}`
      if (identities.has(key)) bad(`Row ${i} of user: duplicate OIDC identity.`)
      identities.add(key)
    }

    const row: Record<string, unknown> = {}
    for (const col of USER_COLUMNS) if (r[col] !== undefined) row[col] = r[col]
    row.auth_provider = provider
    row.password_hash = hash
    row.oidc_issuer = issuer
    row.oidc_subject = subject
    row.oidc_session_version = version
    out.push(row)
  })
  if (localAdmins === 0) {
    bad('Backup contains no local administrator with a password; restoring it could lock you out.')
  }
  return out
}

const OIDC_CONFIG_COLUMNS = [
  'enabled', 'issuer', 'client_id', 'client_secret_ciphertext', 'scopes', 'groups_claim',
  'admin_groups', 'viewer_groups', 'allow_unmatched_viewer', 'allow_http_issuer', 'observed_groups', 'provider_name'
] as const

function normalizeOidcConfig(rows: unknown[] | undefined): Record<string, unknown> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  if (rows.length > 1) bad('Backup contains more than one OIDC configuration row.')
  const r = rows[0]
  if (!r || typeof r !== 'object') bad('Invalid OIDC configuration row.')
  const src = r as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const col of OIDC_CONFIG_COLUMNS) if (src[col] !== undefined) out[col] = src[col]
  for (const col of ['scopes', 'admin_groups', 'viewer_groups', 'observed_groups'] as const) {
    if (out[col] === undefined) continue
    const isStringArray = (raw: unknown): boolean => {
      try {
        const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : null
        return Array.isArray(parsed) && parsed.every(v => typeof v === 'string')
      } catch {
        return false
      }
    }
    if (!isStringArray(out[col])) bad(`OIDC configuration: ${col} must be a JSON array of strings.`)
  }
  const nameRaw = src.provider_name
  if (nameRaw === undefined || nameRaw === null) {
    out.provider_name = null
  } else {
    const parsedName = typeof nameRaw === 'string' ? providerNameSchema.safeParse(nameRaw) : null
    if (!parsedName?.success) bad('OIDC configuration: provider_name must be a plain-text string of at most 64 characters without control characters.')
    out.provider_name = parsedName.data
  }
  const rev = src.config_revision
  out.config_revision = typeof rev === 'number' && Number.isInteger(rev) && rev >= 0 ? rev : 0
  return out
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validatePayload(payload: unknown): { data: DataPayload } {
  if (!payload || typeof payload !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid payload: expected an object.' })
  }
  const obj = payload as Record<string, unknown>
  if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) {
    throw createError({ statusCode: 400, message: 'Invalid payload: missing `data` object.' })
  }
  const schema = obj.schema
  if (schema !== undefined && schema !== 'sqlite-v1') {
    throw createError({
      statusCode: 400,
      message: `Unsupported backup schema "${String(schema)}". Expected "sqlite-v1".`
    })
  }
  return { data: obj.data as DataPayload }
}

function assertUuidIds(rows: unknown[], table: string): void {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, unknown>
    const id = row?.id
    // AppSettings has the literal 'singleton' id; TopologyLayout uses site_id as PK.
    if (table === 'appSettings' || table === 'topologyLayout') continue
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      throw createError({
        statusCode: 400,
        message: `Row ${i} of ${table}: id is not a valid UUID (${typeof id === 'string' ? id : typeof id}).`
      })
    }
  }
}

/**
 * Replace-mode restore: wipe every table in reverse FK order and bulk-insert
 * the payload's rows in forward FK order. Whole operation runs inside a single
 * transaction — partial state is impossible.
 */
export async function restoreAll(prisma: PrismaClient, payload: unknown, options: RestoreOptions = {}): Promise<RestoreResult> {
  const { data } = validatePayload(payload)
  const users = normalizeUsers(data.users)
  const oidcConfig = normalizeOidcConfig(data.oidcConfig)

  // ID validation pass — fail fast before we touch the DB.
  for (const [key, table] of FK_INSERT_ORDER) {
    const rows = data[key]
    if (!Array.isArray(rows)) continue
    assertUuidIds(rows, table)
  }

  const inserted: Record<string, number> = {}
  let oidcDisabledUndecryptable = false

  await prisma.$transaction(async (tx) => {
    // Prior revision must be read BEFORE the wipe: the new revision is always strictly
    // greater than both the prior and the restored one, so previously issued SSO tokens
    // (and any in-flight transactions) can never become valid again.
    const prior = await tx.oidcConfig.findUnique({ where: { id: 'singleton' } })
    const priorRevision = prior?.config_revision ?? 0

    for (const table of REVERSE_FK_DELETE_ORDER) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any)[table].deleteMany()
    }

    if (oidcConfig || prior) {
      const restoredRevision = oidcConfig ? (oidcConfig.config_revision as number) : 0
      const cipher = (oidcConfig?.client_secret_ciphertext as string | null | undefined) ?? null
      let enabled = oidcConfig ? oidcConfig.enabled === true : false
      if (enabled && cipher && !canDecryptOidcSecret(cipher, options.oidcKey ?? undefined)) {
        // Foreign/undecryptable secret: keep the ciphertext (admin sees the status) but disable SSO.
        enabled = false
        oidcDisabledUndecryptable = true
      }
      await tx.oidcConfig.create({
        data: {
          id: 'singleton',
          ...(oidcConfig ?? {}),
          enabled,
          config_revision: Math.max(priorRevision, restoredRevision) + 1,
          updated_at: new Date().toISOString()
        }
      })
      inserted.oidcConfig = 1
    } else {
      inserted.oidcConfig = 0
    }

    for (const [key, table] of FK_INSERT_ORDER) {
      if (key === 'users') {
        const result = await tx.user.createMany({ data: users as never })
        inserted[key] = result.count
        continue
      }
      const rows = data[key]
      if (!Array.isArray(rows) || rows.length === 0) {
        inserted[key] = 0
        continue
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tx as any)[table].createMany({ data: rows })
      inserted[key] = typeof result.count === 'number' ? result.count : rows.length
    }
  }, { timeout: 120_000, maxWait: 10_000 })

  return { inserted, oidcDisabledUndecryptable }
}
