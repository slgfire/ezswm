import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { User, UserRole } from '../../types/user'
import { deriveOidcUsername } from '../utils/oidc/claims'

interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string | null
  role: string
  language: string
  is_setup_user: boolean
  created_at: string
  updated_at: string
  auth_provider: string
  oidc_issuer: string | null
  oidc_subject: string | null
  oidc_session_version: number
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    password_hash: row.password_hash,
    role: row.role as User['role'],
    language: row.language as User['language'],
    is_setup_user: row.is_setup_user,
    created_at: row.created_at,
    updated_at: row.updated_at,
    auth_provider: row.auth_provider === 'oidc' ? 'oidc' : 'local',
    oidc_issuer: row.oidc_issuer,
    oidc_subject: row.oidc_subject,
    oidc_session_version: row.oidc_session_version
  }
}

/** Input for local (password) user creation – unchanged public API. */
export type CreateLocalUserInput = Pick<User, 'username' | 'display_name' | 'role' | 'language' | 'is_setup_user'> & { password_hash: string }

/** Fields a manual update may touch. OIDC identity fields/versions are never updatable here. */
export type UserUpdate = Partial<Pick<User, 'username' | 'display_name' | 'password_hash' | 'role' | 'language' | 'is_setup_user'>>

/** Self-service profile fields; allowed for every account type including OIDC. */
export type UserProfileUpdate = Partial<Pick<User, 'display_name' | 'language'>>

const OIDC_LOCKED_FIELDS = ['username', 'password_hash', 'role', 'is_setup_user'] as const

function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * A "local emergency admin" is a local-provider admin that has a password.
 * Returns how many such admins exist excluding `excludeId`.
 */
async function countOtherLocalAdmins(tx: Tx, excludeId: string): Promise<number> {
  return tx.user.count({
    where: {
      id: { not: excludeId },
      auth_provider: 'local',
      role: 'admin',
      password_hash: { not: null }
    }
  })
}

function isLocalAdmin(row: UserRow): boolean {
  return row.auth_provider === 'local' && row.role === 'admin' && row.password_hash !== null
}

export interface ProvisionOidcUserInput {
  issuer: string
  subject: string
  role: UserRole
  displayName: string
  language?: User['language']
}

export const userRepository = {
  async list(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { username: 'asc' } })
    return rows.map(rowToUser)
  },

  async getById(id: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } })
    return row ? rowToUser(row) : null
  },

  async getByUsername(username: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { username } })
    return row ? rowToUser(row) : null
  },

  async getByOidcIdentity(issuer: string, subject: string): Promise<User | null> {
    const row = await prisma.user.findUnique({
      where: { oidc_issuer_oidc_subject: { oidc_issuer: issuer, oidc_subject: subject } }
    })
    return row ? rowToUser(row) : null
  },

  /** Create a LOCAL (password) user. */
  async create(data: CreateLocalUserInput): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { username: data.username } })
    if (existing) {
      throw createError({ statusCode: 409, message: `Username '${data.username}' already exists` })
    }

    const now = new Date().toISOString()
    const row = await prisma.user.create({
      data: {
        id: randomUUID(),
        username: data.username,
        display_name: data.display_name,
        password_hash: data.password_hash,
        role: data.role,
        language: data.language,
        is_setup_user: data.is_setup_user,
        auth_provider: 'local',
        created_at: now,
        updated_at: now
      }
    })
    return rowToUser(row)
  },

  /**
   * Manual update. OIDC-managed users (role comes from group mapping) cannot have
   * username/password/role/setup flag changed; the last local emergency admin
   * cannot be demoted (checked inside a DB transaction).
   */
  async update(id: string, data: UserUpdate): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id } })
      if (!existing) {
        throw createError({ statusCode: 404, message: 'User not found' })
      }

      if (existing.auth_provider === 'oidc') {
        for (const field of OIDC_LOCKED_FIELDS) {
          if (data[field] !== undefined) {
            throw createError({ statusCode: 409, message: 'OIDC users are managed by the identity provider' })
          }
        }
      }

      if (isLocalAdmin(existing) && data.role !== undefined && data.role !== 'admin') {
        if ((await countOtherLocalAdmins(tx, id)) === 0) {
          throw createError({ statusCode: 409, message: 'Cannot demote the last local administrator' })
        }
      }

      const patch: UserUpdate = {}
      for (const key of Object.keys(data) as (keyof UserUpdate)[]) {
        if (data[key] !== undefined) (patch as Record<string, unknown>)[key] = data[key]
      }
      const row = await tx.user.update({
        where: { id },
        data: { ...patch, updated_at: new Date().toISOString() }
      })
      return rowToUser(row)
    })
  },

  /** Self-service profile update (display_name/language) – valid for OIDC users too. */
  async updateProfile(id: string, data: UserProfileUpdate): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }
    const patch: UserProfileUpdate = {}
    if (data.display_name !== undefined) patch.display_name = data.display_name
    if (data.language !== undefined) patch.language = data.language
    const row = await prisma.user.update({
      where: { id },
      data: { ...patch, updated_at: new Date().toISOString() }
    })
    return rowToUser(row)
  },

  /**
   * Delete a user. Returns false when the user does not exist. Throws 409 if this
   * would remove the last local emergency admin (guarded inside a transaction).
   */
  async delete(id: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id } })
      if (!existing) return false
      if (isLocalAdmin(existing) && (await countOtherLocalAdmins(tx, id)) === 0) {
        throw createError({ statusCode: 409, message: 'Cannot delete the last local administrator' })
      }
      await tx.user.delete({ where: { id } })
      return true
    })
  },

  /**
   * Provision (first login) or authoritatively sync (role/display name) the user for
   * a VALIDATED OIDC identity (issuer + sub). Never links by username/email.
   * Safe under concurrent first logins: identity unique constraint + retry.
   */
  async provisionOrSyncOidcUser(input: ProvisionOidcUserInput): Promise<{ user: User, created: boolean }> {
    const sync = async (existing: UserRow): Promise<User> => {
      const row = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: input.role,
          display_name: input.displayName,
          updated_at: new Date().toISOString()
        }
      })
      return rowToUser(row)
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const existing = await prisma.user.findUnique({
        where: { oidc_issuer_oidc_subject: { oidc_issuer: input.issuer, oidc_subject: input.subject } }
      })
      if (existing) return { user: await sync(existing), created: false }

      const now = new Date().toISOString()
      try {
        const row = await prisma.user.create({
          data: {
            id: randomUUID(),
            username: deriveOidcUsername(input.issuer, input.subject, attempt),
            display_name: input.displayName,
            password_hash: null,
            role: input.role,
            language: input.language ?? 'en',
            is_setup_user: false,
            auth_provider: 'oidc',
            oidc_issuer: input.issuer,
            oidc_subject: input.subject,
            oidc_session_version: 0,
            created_at: now,
            updated_at: now
          }
        })
        return { user: rowToUser(row), created: true }
      } catch (err) {
        if (!isPrismaUniqueError(err)) throw err
        // Either a concurrent first login (identity now exists → next loop syncs)
        // or a username collision (next attempt derives a longer username).
      }
    }
    throw createError({ statusCode: 500, message: 'Could not provision OIDC user' })
  },

  /**
   * Call ONLY after the ID token was fully validated (issuer/sub trusted) and the
   * group mapping denied access: bumps `oidc_session_version` so previously issued
   * OIDC JWTs for this identity stop working. Returns false if the identity has no
   * account (nothing is created, nothing changes). Never call for unvalidated input.
   */
  async invalidateOidcSessions(issuer: string, subject: string): Promise<boolean> {
    const res = await prisma.user.updateMany({
      where: { oidc_issuer: issuer, oidc_subject: subject, auth_provider: 'oidc' },
      data: { oidc_session_version: { increment: 1 } }
    })
    return res.count > 0
  }
}
