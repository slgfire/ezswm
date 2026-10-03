import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import { sha256Hex } from '../utils/oidc/crypto'

/** Server-only single-use OIDC authorization transactions. Never exported in backups. */

export const OIDC_TXN_TTL_MS = 10 * 60 * 1000
export const OIDC_TXN_MAX_GLOBAL = 1000
export const OIDC_TXN_MAX_PER_BINDING = 10

export interface OidcLoginTxn {
  id: string
  state_hash: string
  nonce: string
  code_verifier: string
  binding_hash: string
  config_revision: number
  return_to: string | null
  created_at: string
  expires_at: string
  consumed_at: string | null
}

export interface CreateOidcLoginTxnInput {
  state: string
  nonce: string
  codeVerifier: string
  bindingHash: string
  configRevision: number
  returnTo?: string | null
  now?: Date
}

export type ConsumeFailureReason = 'unknown' | 'expired' | 'consumed' | 'binding_mismatch' | 'revision_mismatch'

export type ConsumeResult =
  | { ok: true, txn: OidcLoginTxn }
  | { ok: false, reason: ConsumeFailureReason }

export function hashOidcState(state: string): string {
  return sha256Hex(`oidc-state:${state}`)
}

export const oidcLoginTxnRepository = {
  /**
   * Create a transaction (bounded globally and per browser binding). Expired rows
   * are purged first. Throws a 429 error when limits are hit.
   */
  async create(input: CreateOidcLoginTxnInput): Promise<OidcLoginTxn> {
    const now = input.now ?? new Date()
    const nowIso = now.toISOString()
    return prisma.$transaction(async (tx) => {
      await tx.oidcLoginTxn.deleteMany({ where: { expires_at: { lte: nowIso } } })
      const global = await tx.oidcLoginTxn.count({ where: { consumed_at: null } })
      if (global >= OIDC_TXN_MAX_GLOBAL) {
        throw createError({ statusCode: 429, message: 'Too many pending sign-in attempts' })
      }
      const perBinding = await tx.oidcLoginTxn.count({ where: { binding_hash: input.bindingHash, consumed_at: null } })
      if (perBinding >= OIDC_TXN_MAX_PER_BINDING) {
        throw createError({ statusCode: 429, message: 'Too many pending sign-in attempts' })
      }
      return tx.oidcLoginTxn.create({
        data: {
          id: randomUUID(),
          state_hash: hashOidcState(input.state),
          nonce: input.nonce,
          code_verifier: input.codeVerifier,
          binding_hash: input.bindingHash,
          config_revision: input.configRevision,
          return_to: input.returnTo ?? null,
          created_at: nowIso,
          expires_at: new Date(now.getTime() + OIDC_TXN_TTL_MS).toISOString(),
          consumed_at: null
        }
      })
    })
  },

  /**
   * Atomically consume a transaction (single use): a compare-and-update that only
   * succeeds when it is unconsumed, unexpired, bound to this browser, and created
   * under the CURRENT config revision. Exactly one concurrent caller gets `ok`.
   */
  async consume(input: { state: string, bindingHash: string, currentRevision: number, now?: Date }): Promise<ConsumeResult> {
    const nowIso = (input.now ?? new Date()).toISOString()
    const stateHash = hashOidcState(input.state)
    const row = await prisma.oidcLoginTxn.findUnique({ where: { state_hash: stateHash } })
    if (!row) return { ok: false, reason: 'unknown' }

    const result = await prisma.oidcLoginTxn.updateMany({
      where: {
        id: row.id,
        consumed_at: null,
        expires_at: { gt: nowIso },
        binding_hash: input.bindingHash,
        config_revision: input.currentRevision
      },
      data: { consumed_at: nowIso }
    })
    if (result.count === 1) return { ok: true, txn: { ...row, consumed_at: nowIso } }

    // Determine a (server-side only) reason for logging; all map to one safe error code.
    const fresh = await prisma.oidcLoginTxn.findUnique({ where: { id: row.id } })
    if (!fresh || fresh.consumed_at !== null) return { ok: false, reason: 'consumed' }
    if (fresh.expires_at <= nowIso) return { ok: false, reason: 'expired' }
    if (fresh.binding_hash !== input.bindingHash) return { ok: false, reason: 'binding_mismatch' }
    return { ok: false, reason: 'revision_mismatch' }
  },

  async deleteExpired(now: Date = new Date()): Promise<number> {
    const res = await prisma.oidcLoginTxn.deleteMany({ where: { expires_at: { lte: now.toISOString() } } })
    return res.count
  },

  /** Remove every transaction (config change, backup restore). */
  async purgeAll(): Promise<number> {
    const res = await prisma.oidcLoginTxn.deleteMany({})
    return res.count
  },

  async countPending(now: Date = new Date()): Promise<number> {
    return prisma.oidcLoginTxn.count({ where: { consumed_at: null, expires_at: { gt: now.toISOString() } } })
  }
}
