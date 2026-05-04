import { hashPassword, verifyPassword, signToken, verifyToken } from '../server/utils/auth'
import { setTestRuntimeConfig, resetTestRuntimeConfig } from './testHelpers'

describe('hashPassword', () => {
  it('returns a string', async () => {
    const hash = await hashPassword('testpassword')
    expect(typeof hash).toBe('string')
  })

  it('hash is not the same as the original password', async () => {
    const password = 'testpassword'
    const hash = await hashPassword(password)
    expect(hash).not.toBe(password)
  })

  it('hash starts with bcrypt prefix', async () => {
    const hash = await hashPassword('testpassword')
    const hasValidPrefix = hash.startsWith('$2a$') || hash.startsWith('$2b$')
    expect(hasValidPrefix, `Expected bcrypt prefix, got: ${hash.substring(0, 4)}`).toBeTruthy()
  })

  it('different calls produce different hashes (unique salts)', async () => {
    const hash1 = await hashPassword('samepassword')
    const hash2 = await hashPassword('samepassword')
    expect(hash1).not.toBe(hash2)
  })

  it('works with minimum length passwords', async () => {
    const hash = await hashPassword('a')
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBeTruthy()
  })

  it('works with long passwords', async () => {
    const longPassword = 'x'.repeat(200)
    const hash = await hashPassword(longPassword)
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBeTruthy()
  })

  it('works with special characters', async () => {
    const hash = await hashPassword('p@$$w0rd!#%&*()äöü🔥')
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBeTruthy()
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'correctpassword'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correctpassword')
    const result = await verifyPassword('wrongpassword', hash)
    expect(result).toBe(false)
  })

  it('returns false for empty password against a hash', async () => {
    const hash = await hashPassword('notempty')
    const result = await verifyPassword('', hash)
    expect(result).toBe(false)
  })

  it('works with special characters (ä, ö, ü, emoji)', async () => {
    const password = 'Passwört_mit_Ümlauten_🎉'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })
})

describe('round-trip', () => {
  it('hash then verify returns true', async () => {
    const password = 'roundtrip-test-123'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)
    expect(result).toBe(true)
  })

  it('hash then verify with wrong password returns false', async () => {
    const password = 'roundtrip-test-123'
    const hash = await hashPassword(password)
    const result = await verifyPassword('wrong-roundtrip', hash)
    expect(result).toBe(false)
  })
})

describe('signToken', () => {
  beforeEach(() => {
    setTestRuntimeConfig({ jwtSecret: 'test-jwt-secret' })
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetTestRuntimeConfig()
  })

  it('returns a JWT string with 3 dot-separated parts', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    expect(token.split('.').length).toBe(3)
  })

  it('payload contains user id, username and role', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    const decoded = verifyToken(token)
    expect(decoded.sub).toBe('user-1')
    expect(decoded.username).toBe('admin')
    expect(decoded.role).toBe('admin')
  })

  it('default expiry is 7 days', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    const decoded = verifyToken(token)
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60)
  })

  it('rememberMe expiry is 30 days', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' }, true)
    const decoded = verifyToken(token)
    expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60)
  })
})

describe('verifyToken', () => {
  beforeEach(() => {
    setTestRuntimeConfig({ jwtSecret: 'test-jwt-secret' })
  })

  afterEach(() => {
    resetTestRuntimeConfig()
  })

  it('decodes a valid token', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    const decoded = verifyToken(token)
    expect(decoded.sub).toBe('user-1')
  })

  it('rejects a tampered token', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyToken(tampered)).toThrow()
  })

  it('rejects a token signed with a different secret', () => {
    const token = signToken({ sub: 'user-1', username: 'admin', role: 'admin' })
    setTestRuntimeConfig({ jwtSecret: 'different-secret' })
    expect(() => verifyToken(token)).toThrow()
  })
})
