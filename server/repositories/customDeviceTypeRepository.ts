import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../db/client'
import type { CustomDeviceType } from '../../types/ipAllocation'
import { BUILTIN_DEVICE_TYPES } from '../../types/ipAllocation'
import { parseDisabledBuiltinDeviceTypes } from '../../types/settings'

interface CustomDeviceTypeRow {
  id: string
  name: string
  active: boolean
}

type Db = PrismaClient | Prisma.TransactionClient

function rowToCustomDeviceType(row: CustomDeviceTypeRow, usageCount = 0): CustomDeviceType {
  return { id: row.id, name: row.name, active: row.active, usage_count: usageCount }
}

async function usageCount(db: Db, id: string): Promise<number> {
  return db.ipAllocation.count({ where: { device_type: id } })
}

async function disabledBuiltinKeys(db: Db): Promise<Set<string>> {
  const row = await db.appSettings.findUnique({
    where: { id: 'singleton' },
    select: { disabled_builtin_device_types: true }
  })
  return new Set(parseDisabledBuiltinDeviceTypes(row?.disabled_builtin_device_types))
}

export const CUSTOM_DEVICE_TYPE_NAME_MAX = 100

/** Normalized (case-insensitive) builtin keys, so a custom name never shadows one. */
const BUILTIN_KEYS_LOWER = new Set(BUILTIN_DEVICE_TYPES.map(k => k.toLowerCase()))

/**
 * Case-insensitive name clash check. SQLite compares case-sensitively, so the
 * comparison happens in JS over the (small) table. Builtin keys are reserved so
 * a custom entry cannot shadow a localized builtin label.
 */
async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const lower = name.toLowerCase()
  if (BUILTIN_KEYS_LOWER.has(lower)) {
    throw createError({ statusCode: 409, message: `"${name}" is a built-in device type` })
  }
  const rows = await prisma.customDeviceType.findMany({ select: { id: true, name: true } })
  const clash = rows.find(r => r.id !== excludeId && r.name.toLowerCase() === lower)
  if (clash) {
    throw createError({ statusCode: 409, message: `A device type named "${name}" already exists` })
  }
}

export const customDeviceTypeRepository = {
  /** All custom types, including inactive ones (settings needs to show them). */
  async list(): Promise<CustomDeviceType[]> {
    const rows = await prisma.customDeviceType.findMany({ orderBy: { name: 'asc' } })
    if (rows.length === 0) return []
    // One grouped query instead of one count per row.
    const counts = await prisma.ipAllocation.groupBy({
      by: ['device_type'],
      where: { device_type: { in: rows.map(r => r.id) } },
      _count: { _all: true }
    })
    const byId = new Map(counts.map(c => [c.device_type, c._count._all]))
    return rows.map(row => rowToCustomDeviceType(row, byId.get(row.id) ?? 0))
  },

  async getById(id: string): Promise<CustomDeviceType | null> {
    const row = await prisma.customDeviceType.findUnique({ where: { id } })
    return row ? rowToCustomDeviceType(row, await usageCount(prisma, id)) : null
  },

  async getByName(name: string): Promise<CustomDeviceType | null> {
    const lower = name.toLowerCase()
    const rows = await prisma.customDeviceType.findMany()
    const row = rows.find(r => r.name.toLowerCase() === lower)
    return row ? rowToCustomDeviceType(row) : null
  },

  async create(name: string): Promise<CustomDeviceType> {
    await assertNameAvailable(name)
    const row = await prisma.customDeviceType.create({
      data: { id: randomUUID(), name, active: true }
    })
    return rowToCustomDeviceType(row)
  },

  async update(id: string, data: { name?: string, active?: boolean }): Promise<CustomDeviceType> {
    const existing = await prisma.customDeviceType.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Device type not found' })
    }
    if (data.name !== undefined && data.name !== existing.name) {
      await assertNameAvailable(data.name, id)
    }
    const row = await prisma.customDeviceType.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.active !== undefined ? { active: data.active } : {})
      }
    })
    return rowToCustomDeviceType(row, await usageCount(prisma, id))
  },

  /**
   * Hard-deletes a custom type only when no allocation currently references it.
   * The count and delete share one transaction so an assignment cannot race the
   * check. Unknown ids (including builtin keys) are 404.
   */
  async deleteUnused(id: string): Promise<CustomDeviceType> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.customDeviceType.findUnique({ where: { id } })
      if (!existing) throw createError({ statusCode: 404, message: 'Device type not found' })

      const count = await usageCount(tx, id)
      if (count > 0) {
        throw createError({
          statusCode: 409,
          message: `Device type "${existing.name}" is still used by ${count} allocation(s)`,
          data: { code: 'DEVICE_TYPE_IN_USE', usage_count: count }
        })
      }

      await tx.customDeviceType.delete({ where: { id } })
      return rowToCustomDeviceType(existing)
    })
  }
}

/**
 * A value is assignable when it is a builtin key or an existing **active**
 * custom type id. `null`/`undefined` clear or preserve the field.
 * `allowLegacy` is used only by the entity importer so re-importing rows that
 * carry a pre-existing raw value does not silently drop or rename it.
 */
export async function assertDeviceTypeAssignable(
  value: string,
  options: { allowLegacy?: boolean, client?: Db } = {}
): Promise<void> {
  const db = options.client ?? prisma
  if ((BUILTIN_DEVICE_TYPES as readonly string[]).includes(value)) {
    if ((await disabledBuiltinKeys(db)).has(value)) {
      throw createError({ statusCode: 400, message: `Device type "${value}" is disabled and cannot be assigned` })
    }
    return
  }
  const found = await db.customDeviceType.findUnique({ where: { id: value } })
  if (found) {
    if (!found.active) {
      throw createError({ statusCode: 400, message: `Device type "${found.name}" is inactive and cannot be assigned` })
    }
    return
  }
  if (options.allowLegacy) return
  throw createError({ statusCode: 400, message: `Unknown device type "${value}"` })
}
