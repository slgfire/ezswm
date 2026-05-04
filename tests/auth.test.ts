import { hashPassword, verifyPassword } from '../server/utils/auth'

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
