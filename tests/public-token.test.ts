import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const TEST_DATA_DIR = join(import.meta.dirname, '.test-data-public-token')

// Stub useRuntimeConfig before any imports that use jsonStorage
;(globalThis as any).useRuntimeConfig = () => ({ dataDir: TEST_DATA_DIR })

describe('publicTokenRepository', () => {
  let publicTokenRepository: typeof import('../server/repositories/publicTokenRepository').publicTokenRepository

  beforeEach(async () => {
    rmSync(TEST_DATA_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DATA_DIR, { recursive: true })
    writeFileSync(join(TEST_DATA_DIR, 'publicTokens.json'), '[]')
    const mod = await import('../server/repositories/publicTokenRepository')
    publicTokenRepository = mod.publicTokenRepository
  })

  it('creates a token with 32-char token string', () => {
    const token = publicTokenRepository.create('switch-1')
    assert.strictEqual(token.token.length, 32)
    assert.strictEqual(token.switch_id, 'switch-1')
    assert.strictEqual(token.revoked_at, null)
    assert.strictEqual(token.last_access_at, null)
    assert.ok(token.id.length > 0)
    assert.ok(token.created_at.length > 0)
  })

  it('enforces one active token per switch', () => {
    publicTokenRepository.create('switch-1')
    assert.throws(
      () => publicTokenRepository.create('switch-1'),
      (err: any) => err.statusCode === 409
    )
  })

  it('allows new token after revoking', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    const second = publicTokenRepository.create('switch-1')
    assert.notStrictEqual(first.token, second.token)
  })

  it('looks up active token by token string', () => {
    const created = publicTokenRepository.create('switch-1')
    const found = publicTokenRepository.getByToken(created.token)
    assert.ok(found)
    assert.strictEqual(found!.id, created.id)
  })

  it('returns null for revoked token from getByToken', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const found = publicTokenRepository.getByToken(created.token)
    assert.strictEqual(found, null)
  })

  it('getLatestBySwitchId returns revoked token', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const latest = publicTokenRepository.getLatestBySwitchId('switch-1')
    assert.ok(latest)
    assert.ok(latest!.revoked_at)
  })

  it('deleteBySwitchId removes all tokens for switch', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    publicTokenRepository.create('switch-1')
    publicTokenRepository.deleteBySwitchId('switch-1')
    assert.strictEqual(publicTokenRepository.getLatestBySwitchId('switch-1'), null)
  })

  it('updateLastAccess sets timestamp', () => {
    const created = publicTokenRepository.create('switch-1')
    assert.strictEqual(created.last_access_at, null)
    publicTokenRepository.updateLastAccess(created.id)
    const updated = publicTokenRepository.getByToken(created.token)
    assert.ok(updated!.last_access_at)
  })
})
