import type { PrismaClient } from '@prisma/client'
import { canDecryptOidcSecret } from './oidc/crypto'
import { providerNameSchema } from '../validators/oidcSchemas'
import { BUILTIN_DEVICE_TYPES } from '../../types/ipAllocation'
import { isSafeManagementUrl } from '../validators/switchSchemas'
import { canonicalizeCIDR, isValidCIDR } from './ipv4'
import { findAllocationConflict, findNetworkConflict } from './networkConflicts'

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
  'apiToken', // always purged (even from old backups), never restored
  'user',
  'patchPanelToken',
  'patchPanelSocket',
  'patchPanel',
  'customDeviceType',
  'site'
] as const

// Forward (parent → child) order for inserts. Sites come before users because a
// user may reference its preferred start site.
const FK_INSERT_ORDER = [
  ['settings', 'appSettings'],
  ['sites', 'site'],
  ['users', 'user'],
  ['patchPanels', 'patchPanel'],
  ['patchPanelSockets', 'patchPanelSocket'],
  ['patchPanelTokens', 'patchPanelToken'],
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
  ['customDeviceTypes', 'customDeviceType'],
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
  'created_at', 'updated_at', 'auth_provider', 'oidc_issuer', 'oidc_subject', 'oidc_session_version',
  'start_site_id'
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
    // Legacy backups have no start site; the FK itself rejects unknown site IDs.
    const startSiteId = r.start_site_id === undefined ? null : r.start_site_id
    if (startSiteId !== null && (typeof startSiteId !== 'string' || !UUID_RE.test(startSiteId))) {
      bad(`Row ${i} of user: start_site_id must be a UUID or null.`)
    }

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
    row.start_site_id = startSiteId
    out.push(row)
  })
  if (localAdmins === 0) {
    bad('Backup contains no local administrator with a password; restoring it could lock you out.')
  }
  return out
}

const SETTINGS_COLUMNS = [
  'id', 'app_name', 'app_logo_url', 'default_vlan', 'default_port_status', 'port_speeds',
  'setup_completed', 'sites_initialized', 'patch_panels_enabled', 'switch_groups_enabled',
  'disabled_builtin_device_types'
] as const

const BUILTIN_DEVICE_TYPE_SET = new Set<string>(BUILTIN_DEVICE_TYPES)

/**
 * Settings (Issue #301): copy only known columns and normalize the disabled
 * builtin list. Older backups without the field restore as "nothing disabled";
 * malformed or duplicate/unknown keys reject the whole restore before any write.
 */
function normalizeSettings(rows: unknown[] | undefined): Record<string, unknown>[] | undefined {
  if (rows === undefined) return undefined
  if (!Array.isArray(rows)) bad('Backup settings must be an array.')
  if (rows.length > 1) bad('Backup contains more than one settings row.')
  if (rows.length === 0) return []

  const raw = rows[0]
  if (!raw || typeof raw !== 'object') bad('Invalid settings row.')
  const src = raw as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const col of SETTINGS_COLUMNS) if (src[col] !== undefined) out[col] = src[col]

  if (out.disabled_builtin_device_types === undefined) {
    out.disabled_builtin_device_types = '[]'
  } else {
    let parsed: unknown
    try {
      parsed = typeof out.disabled_builtin_device_types === 'string'
        ? JSON.parse(out.disabled_builtin_device_types)
        : out.disabled_builtin_device_types
    } catch {
      bad('Settings: disabled_builtin_device_types must be a JSON array of builtin device-type keys.')
    }
    if (
      !Array.isArray(parsed)
      || parsed.length > BUILTIN_DEVICE_TYPES.length
      || parsed.some(v => typeof v !== 'string' || !BUILTIN_DEVICE_TYPE_SET.has(v))
      || new Set(parsed).size !== parsed.length
    ) {
      bad('Settings: disabled_builtin_device_types must contain unique builtin device-type keys.')
    }
    out.disabled_builtin_device_types = JSON.stringify(parsed)
  }
  return [out]
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

/**
 * Custom device types (Issue #301). Missing key = legacy backup, restored as an
 * empty list. Rows are structural only: stable UUID id, trimmed 1..100 name and
 * a boolean `active`. Names must be unique case-insensitively.
 */
function normalizeCustomDeviceTypes(rows: unknown[] | undefined): Record<string, unknown>[] {
  if (rows === undefined) return []
  if (!Array.isArray(rows)) bad('Backup customDeviceTypes must be an array.')
  const out: Record<string, unknown>[] = []
  const names = new Set<string>()
  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') bad(`Row ${i} of customDeviceType: expected an object.`)
    const r = raw as Record<string, unknown>
    if (typeof r.id !== 'string' || !UUID_RE.test(r.id)) bad(`Row ${i} of customDeviceType: id must be a UUID.`)
    if (typeof r.name !== 'string') bad(`Row ${i} of customDeviceType: name must be a string.`)
    const name = r.name.trim()
    if (name.length < 1 || name.length > 100) bad(`Row ${i} of customDeviceType: name must be 1..100 characters.`)
    const lower = name.toLowerCase()
    if (names.has(lower)) bad(`Row ${i} of customDeviceType: duplicate name.`)
    names.add(lower)
    if (r.active !== undefined && typeof r.active !== 'boolean') bad(`Row ${i} of customDeviceType: active must be a boolean.`)
    out.push({ id: r.id, name, active: r.active === undefined ? true : r.active })
  })
  return out
}

/**
 * Switch management links (Issue #302). Older backups lack both fields and
 * restore as HTTPS with no override. Present values are validated before any
 * write so a tampered backup cannot persist a javascript:/credential link.
 */
function normalizeSwitchManagement(rows: unknown[] | undefined): void {
  if (!Array.isArray(rows)) return
  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return // shape errors are rejected by the insert itself
    const r = raw as Record<string, unknown>
    if (r.management_protocol === undefined) r.management_protocol = 'https'
    else if (r.management_protocol !== 'https' && r.management_protocol !== 'http') bad(`Row ${i} of switch: management_protocol must be "https" or "http".`)
    if (r.management_url === undefined) r.management_url = null
    else if (r.management_url !== null && (typeof r.management_url !== 'string' || !isSafeManagementUrl(r.management_url))) {
      bad(`Row ${i} of switch: management_url must be null or an http(s) URL without credentials.`)
    }
  })
}

/**
 * Scoped network uniqueness: canonicalize subnets and reject duplicate
 * (site, VLAN scope, CIDR) networks and (network, ip) allocations before any
 * write, so the existing data is never wiped for a payload the DB would reject.
 */
function normalizeNetworks(data: DataPayload): void {
  const networks = Array.isArray(data.networks) ? data.networks as Record<string, unknown>[] : []
  for (const n of networks) {
    if (n && typeof n.subnet === 'string' && isValidCIDR(n.subnet)) n.subnet = canonicalizeCIDR(n.subnet)
  }
  const netMsg = findNetworkConflict(networks.filter(n => n && typeof n === 'object'))
  if (netMsg) bad(`Backup rejected: ${netMsg}.`)
  const allocs = Array.isArray(data.ipAllocations) ? data.ipAllocations as Record<string, unknown>[] : []
  const allocMsg = findAllocationConflict(allocs.filter(a => a && typeof a === 'object'))
  if (allocMsg) bad(`Backup rejected: ${allocMsg}.`)
}

const PATCH_PANEL_KEYS = ['patchPanels', 'patchPanelSockets', 'patchPanelTokens'] as const

/**
 * Patch panel data is all-or-nothing: either all three arrays are absent (legacy
 * backup) or all three are arrays (an empty array is an intentional empty snapshot).
 * Returns true when the payload carries patch panel data.
 */
function hasPatchPanelData(data: DataPayload): boolean {
  const present = PATCH_PANEL_KEYS.filter(k => data[k] !== undefined)
  if (present.length === 0) return false
  if (present.length !== PATCH_PANEL_KEYS.length || PATCH_PANEL_KEYS.some(k => !Array.isArray(data[k]))) {
    bad('Backup contains incomplete patch panel data: patchPanels, patchPanelSockets and patchPanelTokens must all be present as arrays.')
  }
  return true
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
  data.settings = normalizeSettings(data.settings)
  data.customDeviceTypes = normalizeCustomDeviceTypes(data.customDeviceTypes)
  normalizeSwitchManagement(data.switches)
  normalizeNetworks(data)
  const includesPatchPanels = hasPatchPanelData(data)

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

    if (!includesPatchPanels) {
      const existing = (await tx.patchPanel.count()) + (await tx.patchPanelSocket.count()) + (await tx.patchPanelToken.count())
      if (existing > 0) {
        bad('This backup does not include patch panel data and restoring it would delete the existing patch panels. Create a current full backup first.')
      }
    }

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
