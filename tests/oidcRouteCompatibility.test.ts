import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma } from './testHelpers'
import { userRepository } from '../server/repositories/userRepository'
import { hashPassword } from '../server/utils/auth'
import loginRoute from '../server/api/auth/login.post'
import passwordRoute from '../server/api/users/[id]/password.put'
import createUserRoute from '../server/api/users/index.post'

type Handler = (event: unknown) => Promise<unknown>
const call = (h: unknown, event: Record<string, unknown>) => (h as Handler)(event)

describe('OIDC compatibility of local auth/user routes', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>

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
  })

  it('password login refuses OIDC users with the same generic 401 as a wrong password', async () => {
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp', subject: 's', role: 'admin', displayName: 'O' })
    await userRepository.create({ username: 'localadmin', display_name: 'L', password_hash: await hashPassword('correct-password'), role: 'admin', language: 'en', is_setup_user: false })

    const oidcAttempt = await call(loginRoute, { body: { username: user.username, password: 'anything-at-all' } }).catch(e => e)
    const wrongPassword = await call(loginRoute, { body: { username: 'localadmin', password: 'wrong-password' } }).catch(e => e)
    const unknown = await call(loginRoute, { body: { username: 'nobody', password: 'wrong-password' } }).catch(e => e)
    for (const err of [oidcAttempt, wrongPassword, unknown]) {
      expect(err).toMatchObject({ statusCode: 401, message: 'Invalid username or password' })
    }
  })

  it('password login refuses a local-provider user that has no password hash', async () => {
    const now = new Date().toISOString()
    await prisma.user.create({ data: { id: 'nohash', username: 'nohash', display_name: 'N', password_hash: null, role: 'viewer', language: 'en', created_at: now, updated_at: now } })
    const err = await call(loginRoute, { body: { username: 'nohash', password: 'whatever123' } }).catch(e => e)
    expect(err).toMatchObject({ statusCode: 401, message: 'Invalid username or password' })
  })

  it('password change returns 403 for OIDC users before verifying anything', async () => {
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp', subject: 's', role: 'viewer', displayName: 'O' })
    const err = await call(passwordRoute, { context: { params: { id: user.id } }, body: { current_password: 'x', new_password: 'newpassword123' } }).catch(e => e)
    expect(err).toMatchObject({ statusCode: 403 })
    expect((await userRepository.getById(user.id))?.password_hash).toBeNull()
  })

  it('password change still works for local users', async () => {
    const u = await userRepository.create({ username: 'loc', display_name: 'L', password_hash: await hashPassword('old-password-1'), role: 'admin', language: 'en', is_setup_user: false })
    const res = await call(passwordRoute, { context: { params: { id: u.id } }, body: { current_password: 'old-password-1', new_password: 'new-password-2' } })
    expect(res).toMatchObject({ message: 'Password changed successfully' })
  })

  it('manual user creation yields a local password user without auth fields from the body', async () => {
    const created = await call(createUserRoute, {
      body: {
        username: 'newlocal', display_name: 'New', password: 'password-123', role: 'viewer',
        auth_provider: 'oidc', oidc_issuer: 'https://evil', oidc_subject: 'x', is_setup_user: true
      }
    }) as Record<string, unknown>
    expect(created).toMatchObject({ username: 'newlocal', role: 'viewer', language: 'en', auth_provider: 'local', oidc_issuer: null, oidc_subject: null, is_setup_user: false })
    expect(created).not.toHaveProperty('password_hash')
    const row = await prisma.user.findUnique({ where: { username: 'newlocal' } })
    expect(row?.password_hash).toBeTruthy()
  })
})
