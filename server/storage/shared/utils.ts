import { randomUUID } from 'node:crypto'

export function nowIso(): string {
  return new Date().toISOString()
}

export function withTimestamps<T extends object>(existing: T | undefined, payload: T): T & { createdAt: string; updatedAt: string } {
  const timestamp = nowIso()
  return {
    ...payload,
    createdAt: (existing as { createdAt?: string } | undefined)?.createdAt || timestamp,
    updatedAt: timestamp
  } as T & { createdAt: string; updatedAt: string }
}

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function compareNames(left: string, right: string): boolean {
  return normalizeName(left).toLocaleLowerCase() === normalizeName(right).toLocaleLowerCase()
}
