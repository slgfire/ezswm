import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSwitch } from './testHelpers'
import { publicTokenRepository } from '../server/repositories/publicTokenRepository'

describe('publicTokenRepository', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let switchId: string

  beforeAll(async () => {
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
  })

  afterAll(async () => {
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    switchId = (await seedSwitch(prisma)).id
  })

  it('creates a token with 32-char token string', async () => {
    const token = await publicTokenRepository.create(switchId)
    expect(token.token.length).toBe(32)
    expect(token.switch_id).toBe(switchId)
    expect(token.revoked_at).toBe(null)
    expect(token.last_access_at).toBe(null)
    expect(token.id.length).toBeGreaterThan(0)
    expect(token.created_at.length).toBeGreaterThan(0)
  })

  it('enforces one active token per switch', async () => {
    await publicTokenRepository.create(switchId)
    await expect(publicTokenRepository.create(switchId))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('allows new token after revoking', async () => {
    const first = await publicTokenRepository.create(switchId)
    await publicTokenRepository.revoke(first.id)
    const second = await publicTokenRepository.create(switchId)
    expect(first.token).not.toBe(second.token)
  })

  it('looks up active token by token string', async () => {
    const created = await publicTokenRepository.create(switchId)
    const found = await publicTokenRepository.getByToken(created.token)
    expect(found).toBeTruthy()
    expect(found!.id).toBe(created.id)
  })

  it('returns null for revoked token from getByToken', async () => {
    const created = await publicTokenRepository.create(switchId)
    await publicTokenRepository.revoke(created.id)
    const found = await publicTokenRepository.getByToken(created.token)
    expect(found).toBe(null)
  })

  it('getLatestBySwitchId returns revoked token', async () => {
    const created = await publicTokenRepository.create(switchId)
    await publicTokenRepository.revoke(created.id)
    const latest = await publicTokenRepository.getLatestBySwitchId(switchId)
    expect(latest).toBeTruthy()
    expect(latest!.revoked_at).toBeTruthy()
  })

  it('deleteBySwitchId removes all tokens for switch', async () => {
    const first = await publicTokenRepository.create(switchId)
    await publicTokenRepository.revoke(first.id)
    await publicTokenRepository.create(switchId)
    await publicTokenRepository.deleteBySwitchId(switchId)
    expect(await publicTokenRepository.getLatestBySwitchId(switchId)).toBe(null)
  })

  it('updateLastAccess sets timestamp', async () => {
    const created = await publicTokenRepository.create(switchId)
    expect(created.last_access_at).toBe(null)
    await publicTokenRepository.updateLastAccess(created.id)
    const updated = await publicTokenRepository.getByToken(created.token)
    expect(updated!.last_access_at).toBeTruthy()
  })
})
