import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { CustomDeviceType } from '../../types/ipAllocation'
import { BUILTIN_DEVICE_TYPES } from '../../types/ipAllocation'

interface CustomDeviceTypeRow {
  id: string
  name: string
  active: boolean
}

function rowToCustomDeviceType(row: CustomDeviceTypeRow): CustomDeviceType {
  return { id: row.id, name: row.name, active: row.active }
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
    return rows.map(rowToCustomDeviceType)
  },

  async getById(id: string): Promise<CustomDeviceType | null> {
    const row = await prisma.customDeviceType.findUnique({ where: { id } })
    return row ? rowToCustomDeviceType(row) : null
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
    return rowToCustomDeviceType(row)
  }
}

/**
 * A value is assignable when it is a builtin key or an existing **active**
 * custom type id. `null`/`undefined` clear or preserve the field.
 * `allowLegacy` is used only by the entity importer so re-importing rows that
 * carry a pre-existing raw value does not silently drop or rename it.
 */
export async function assertDeviceTypeAssignable(value: string, options: { allowLegacy?: boolean } = {}): Promise<void> {
  if ((BUILTIN_DEVICE_TYPES as readonly string[]).includes(value)) return
  const found = await prisma.customDeviceType.findUnique({ where: { id: value } })
  if (found) {
    if (!found.active) {
      throw createError({ statusCode: 400, message: `Device type "${found.name}" is inactive and cannot be assigned` })
    }
    return
  }
  if (options.allowLegacy) return
  throw createError({ statusCode: 400, message: `Unknown device type "${value}"` })
}
