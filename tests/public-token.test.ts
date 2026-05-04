import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'

describe('publicTokenRepository', () => {
  let publicTokenRepository: typeof import('../server/repositories/publicTokenRepository').publicTokenRepository
  let tempDir: string

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'publicTokens.json', [])
    const mod = await import('../server/repositories/publicTokenRepository')
    publicTokenRepository = mod.publicTokenRepository
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  it('creates a token with 32-char token string', () => {
    const token = publicTokenRepository.create('switch-1')
    expect(token.token.length).toBe(32)
    expect(token.switch_id).toBe('switch-1')
    expect(token.revoked_at).toBe(null)
    expect(token.last_access_at).toBe(null)
    expect(token.id.length).toBeGreaterThan(0)
    expect(token.created_at.length).toBeGreaterThan(0)
  })

  it('enforces one active token per switch', () => {
    publicTokenRepository.create('switch-1')
    try {
      publicTokenRepository.create('switch-1')
      expect.fail('Expected create to throw')
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(409)
    }
  })

  it('allows new token after revoking', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    const second = publicTokenRepository.create('switch-1')
    expect(first.token).not.toBe(second.token)
  })

  it('looks up active token by token string', () => {
    const created = publicTokenRepository.create('switch-1')
    const found = publicTokenRepository.getByToken(created.token)
    expect(found).toBeTruthy()
    expect(found!.id).toBe(created.id)
  })

  it('returns null for revoked token from getByToken', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const found = publicTokenRepository.getByToken(created.token)
    expect(found).toBe(null)
  })

  it('getLatestBySwitchId returns revoked token', () => {
    const created = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(created.id)
    const latest = publicTokenRepository.getLatestBySwitchId('switch-1')
    expect(latest).toBeTruthy()
    expect(latest!.revoked_at).toBeTruthy()
  })

  it('deleteBySwitchId removes all tokens for switch', () => {
    const first = publicTokenRepository.create('switch-1')
    publicTokenRepository.revoke(first.id)
    publicTokenRepository.create('switch-1')
    publicTokenRepository.deleteBySwitchId('switch-1')
    expect(publicTokenRepository.getLatestBySwitchId('switch-1')).toBe(null)
  })

  it('updateLastAccess sets timestamp', () => {
    const created = publicTokenRepository.create('switch-1')
    expect(created.last_access_at).toBe(null)
    publicTokenRepository.updateLastAccess(created.id)
    const updated = publicTokenRepository.getByToken(created.token)
    expect(updated!.last_access_at).toBeTruthy()
  })
})
