import type { PrismaClient } from '@prisma/client'

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
  'layoutTemplate',
  'appSettings',
  'user',
  'site'
] as const

// Forward (parent → child) order for inserts.
const FK_INSERT_ORDER = [
  ['users', 'user'],
  ['settings', 'appSettings'],
  ['sites', 'site'],
  ['layoutTemplates', 'layoutTemplate'],
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
export async function restoreAll(prisma: PrismaClient, payload: unknown): Promise<{ inserted: Record<string, number> }> {
  const { data } = validatePayload(payload)

  // ID validation pass — fail fast before we touch the DB.
  for (const [key, table] of FK_INSERT_ORDER) {
    const rows = data[key]
    if (!Array.isArray(rows)) continue
    assertUuidIds(rows, table)
  }

  const inserted: Record<string, number> = {}

  await prisma.$transaction(async (tx) => {
    for (const table of REVERSE_FK_DELETE_ORDER) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any)[table].deleteMany()
    }

    for (const [key, table] of FK_INSERT_ORDER) {
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

  return { inserted }
}
