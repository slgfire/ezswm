import { randomUUID } from 'node:crypto'
import { nanoid } from 'nanoid'
import { prisma } from '../db/client'
import type { PublicToken } from '../../types/publicToken'

interface TokenRow {
  id: string
  switch_id: string
  token: string
  created_at: string
  revoked_at: string | null
  last_access_at: string | null
}

function rowToToken(row: TokenRow): PublicToken {
  return {
    id: row.id,
    switch_id: row.switch_id,
    token: row.token,
    created_at: row.created_at,
    revoked_at: row.revoked_at,
    last_access_at: row.last_access_at
  }
}

export const publicTokenRepository = {
  async getByToken(token: string): Promise<PublicToken | null> {
    const row = await prisma.publicToken.findFirst({
      where: { token, revoked_at: null }
    })
    return row ? rowToToken(row) : null
  },

  async getBySwitchId(switchId: string): Promise<PublicToken | null> {
    const row = await prisma.publicToken.findFirst({
      where: { switch_id: switchId, revoked_at: null }
    })
    return row ? rowToToken(row) : null
  },

  async getLatestBySwitchId(switchId: string): Promise<PublicToken | null> {
    const row = await prisma.publicToken.findFirst({
      where: { switch_id: switchId },
      orderBy: { created_at: 'desc' }
    })
    return row ? rowToToken(row) : null
  },

  async create(switchId: string): Promise<PublicToken> {
    const existing = await this.getBySwitchId(switchId)
    if (existing) {
      const err: Error & { statusCode?: number } = new Error('Switch already has an active public token')
      err.statusCode = 409
      throw err
    }

    const row = await prisma.publicToken.create({
      data: {
        id: randomUUID(),
        switch_id: switchId,
        // The token itself stays nanoid: it's a URL-friendly shared secret,
        // not a primary key, and short URLs are nicer than UUIDs.
        token: nanoid(32),
        created_at: new Date().toISOString(),
        revoked_at: null,
        last_access_at: null
      }
    })
    return rowToToken(row)
  },

  async revoke(id: string): Promise<PublicToken> {
    try {
      const row = await prisma.publicToken.update({
        where: { id },
        data: { revoked_at: new Date().toISOString() }
      })
      return rowToToken(row)
    } catch {
      const err: Error & { statusCode?: number } = new Error('Token not found')
      err.statusCode = 404
      throw err
    }
  },

  async updateLastAccess(id: string): Promise<void> {
    await prisma.publicToken.update({
      where: { id },
      data: { last_access_at: new Date().toISOString() }
    }).catch(() => { /* token may have been deleted */ })
  },

  async deleteBySwitchId(switchId: string): Promise<void> {
    await prisma.publicToken.deleteMany({ where: { switch_id: switchId } })
  }
}
