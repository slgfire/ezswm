import { createHash, randomUUID } from 'node:crypto'
import { nanoid } from 'nanoid'
import { prisma } from '../db/client'
import { API_TOKEN_PREFIX, type ApiTokenCreated, type ApiTokenDto } from '../../types/apiToken'

/** Best-effort last-used writes happen at most once per token per this window. */
export const API_TOKEN_LAST_USED_THROTTLE_MS = 60_000

export const hashApiToken = (plaintext: string): string => createHash('sha256').update(plaintext).digest('hex')

function toDto(row: { id: string, name: string, created_at: string, last_used_at: string | null, expires_at: string | null }): ApiTokenDto {
  return { id: row.id, name: row.name, created_at: row.created_at, last_used_at: row.last_used_at, expires_at: row.expires_at }
}

export type CreateApiTokenResult =
  | { ok: true, token: ApiTokenCreated }
  | { ok: false, reason: 'duplicate_name' | 'limit' | 'forbidden_owner' | 'no_user' }

export const apiTokenRepository = {
  async listByUser(userId: string): Promise<ApiTokenDto[]> {
    const rows = await prisma.apiToken.findMany({ where: { user_id: userId }, orderBy: { created_at: 'asc' } })
    return rows.map(toDto)
  },

  /**
   * Local accounts only. Name uniqueness (unique index) and the 10-token limit
   * (DB trigger) are enforced by SQLite itself, so concurrent creates cannot violate them.
   */
  async create(userId: string, input: { name: string, expires_at?: string | null }): Promise<CreateApiTokenResult> {
    const owner = await prisma.user.findUnique({ where: { id: userId }, select: { auth_provider: true } })
    if (!owner) return { ok: false, reason: 'no_user' }
    if (owner.auth_provider !== 'local') return { ok: false, reason: 'forbidden_owner' }

    const plaintext = `${API_TOKEN_PREFIX}${nanoid(32)}`
    try {
      const row = await prisma.apiToken.create({
        data: {
          id: randomUUID(),
          name: input.name,
          token_hash: hashApiToken(plaintext),
          user_id: userId,
          created_at: new Date().toISOString(),
          expires_at: input.expires_at ? new Date(input.expires_at).toISOString() : null
        }
      })
      return { ok: true, token: { ...toDto(row), token: plaintext } }
    } catch (err) {
      const e = err as { code?: string, message?: string, meta?: unknown }
      // The adapter surfaces the trigger's RAISE text inside `meta` (as a P2003 constraint error).
      if (e.message?.includes('api_token_limit') || JSON.stringify(e.meta ?? null).includes('api_token_limit')) return { ok: false, reason: 'limit' }
      if (e.code === 'P2002') return { ok: false, reason: 'duplicate_name' }
      // FK violation: owner deleted concurrently.
      if (e.code === 'P2003') return { ok: false, reason: 'no_user' }
      throw err
    }
  },

  /** Revoke one token only if it belongs to `userId`. */
  async deleteOwned(userId: string, tokenId: string): Promise<boolean> {
    const r = await prisma.apiToken.deleteMany({ where: { id: tokenId, user_id: userId } })
    return r.count > 0
  },

  async deleteAllByUser(userId: string): Promise<number> {
    return (await prisma.apiToken.deleteMany({ where: { user_id: userId } })).count
  },

  /**
   * Resolve a plaintext token. Null for unknown/expired. `last_used_at` is a
   * conditional DB update (no process cache); auth never depends on it.
   */
  async authenticate(plaintext: string, now: Date = new Date()): Promise<{ id: string, name: string, user_id: string } | null> {
    const row = await prisma.apiToken.findUnique({ where: { token_hash: hashApiToken(plaintext) } })
    if (!row) return null
    if (row.expires_at && Date.parse(row.expires_at) <= now.getTime()) return null
    const cutoff = new Date(now.getTime() - API_TOKEN_LAST_USED_THROTTLE_MS).toISOString()
    try {
      await prisma.apiToken.updateMany({
        where: { id: row.id, OR: [{ last_used_at: null }, { last_used_at: { lt: cutoff } }] },
        data: { last_used_at: now.toISOString() }
      })
    } catch {
      // best effort
    }
    return { id: row.id, name: row.name, user_id: row.user_id }
  }
}
