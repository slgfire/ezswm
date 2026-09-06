import { randomUUID } from 'node:crypto'
import { nanoid } from 'nanoid'

import { prisma } from '../db/client'
import type { PatchPanelToken } from '../../types/patchPanelToken'

interface TokenRow {
  id: string
  patch_panel_id: string
  token: string
  created_at: string
  revoked_at: string | null
  last_access_at: string | null
}

function rowToToken(row: TokenRow): PatchPanelToken {
  return {
    id: row.id,
    patch_panel_id: row.patch_panel_id,
    token: row.token,
    created_at: row.created_at,
    revoked_at: row.revoked_at,
    last_access_at: row.last_access_at
  }
}

export const patchPanelTokenRepository = {
  async getByToken(token: string): Promise<PatchPanelToken | null> {
    const row = await prisma.patchPanelToken.findFirst({
      where: { token, revoked_at: null }
    })
    return row ? rowToToken(row) : null
  },

  async getByPatchPanelId(patchPanelId: string): Promise<PatchPanelToken | null> {
    const row = await prisma.patchPanelToken.findFirst({
      where: { patch_panel_id: patchPanelId, revoked_at: null }
    })
    return row ? rowToToken(row) : null
  },

  async getLatestByPatchPanelId(patchPanelId: string): Promise<PatchPanelToken | null> {
    const row = await prisma.patchPanelToken.findFirst({
      where: { patch_panel_id: patchPanelId },
      orderBy: { created_at: 'desc' }
    })
    return row ? rowToToken(row) : null
  },

  async create(patchPanelId: string): Promise<PatchPanelToken> {
    const existing = await this.getByPatchPanelId(patchPanelId)
    if (existing) {
      const err: Error & { statusCode?: number } = new Error('Patch panel already has an active public token')
      err.statusCode = 409
      throw err
    }

    const row = await prisma.patchPanelToken.create({
      data: {
        id: randomUUID(),
        patch_panel_id: patchPanelId,
        token: nanoid(32),
        created_at: new Date().toISOString(),
        revoked_at: null,
        last_access_at: null
      }
    })

    return rowToToken(row)
  },

  async revoke(id: string): Promise<PatchPanelToken> {
    try {
      const row = await prisma.patchPanelToken.update({
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
    await prisma.patchPanelToken.update({
      where: { id },
      data: { last_access_at: new Date().toISOString() }
    }).catch(() => { /* token may have been deleted */ })
  }
}
