import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { PublicToken } from '~~/types/publicToken'

const FILE = 'publicTokens.json'

function readAll(): PublicToken[] {
  return readJson<PublicToken[]>(FILE)
}

function writeAll(tokens: PublicToken[]): void {
  writeJson(FILE, tokens)
}

export const publicTokenRepository = {
  getByToken(token: string): PublicToken | null {
    const all = readAll()
    return all.find(t => t.token === token && t.revoked_at === null) ?? null
  },

  getBySwitchId(switchId: string): PublicToken | null {
    const all = readAll()
    return all.find(t => t.switch_id === switchId && t.revoked_at === null) ?? null
  },

  getLatestBySwitchId(switchId: string): PublicToken | null {
    const all = readAll()
    const forSwitch = all
      .filter(t => t.switch_id === switchId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return forSwitch[0] ?? null
  },

  create(switchId: string): PublicToken {
    const existing = this.getBySwitchId(switchId)
    if (existing) {
      const err = new Error('Switch already has an active public token') as any
      err.statusCode = 409
      throw err
    }

    const token: PublicToken = {
      id: nanoid(),
      switch_id: switchId,
      token: nanoid(32),
      created_at: new Date().toISOString(),
      revoked_at: null,
      last_access_at: null
    }

    const all = readAll()
    all.push(token)
    writeAll(all)
    return token
  },

  revoke(id: string): PublicToken {
    const all = readAll()
    const index = all.findIndex(t => t.id === id)
    if (index === -1) {
      const err = new Error('Token not found') as any
      err.statusCode = 404
      throw err
    }
    all[index]!.revoked_at = new Date().toISOString()
    writeAll(all)
    return all[index]!
  },

  updateLastAccess(id: string): void {
    const all = readAll()
    const token = all.find(t => t.id === id)
    if (token) {
      token.last_access_at = new Date().toISOString()
      writeAll(all)
    }
  },

  deleteBySwitchId(switchId: string): void {
    const all = readAll()
    const filtered = all.filter(t => t.switch_id !== switchId)
    if (filtered.length !== all.length) {
      writeAll(filtered)
    }
  }
}
