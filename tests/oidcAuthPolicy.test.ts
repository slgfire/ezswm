import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'

import { createTestPrisma, getTestRuntimeConfig } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'
import { evaluateRolePolicy, normalizePolicyPath } from '../server/utils/requireAdmin'
import { hashPassword, signToken } from '../server/utils/auth'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { userRepository } from '../server/repositories/userRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'
const UUID_OTHER = '00000000-0000-4000-8000-000000000001'

describe('auth middleware + role policy (real JWT, real DB user lookup, real handlers)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    installH3Globals()
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
  })

  afterAll(async () => {
    resetOidcRuntime()
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    await prisma.oidcLoginTxn.deleteMany()
    await prisma.oidcConfig.deleteMany()
    resetOidcRuntime()
    setOidcRuntime({ oidcEncryptionKey: KEY_B64, publicBaseUrl: '' })
  })

  const enableOidc = () => oidcConfigRepository.update({
    enabled: true,
    issuer: ISSUER,
    client_id: 'cid',
    client_secret_ciphertext: encryptOidcSecret('the-client-secret', parseOidcEncryptionKey(KEY_B64)),
    admin_groups: ['admins']
  })

  async function oidcUser(role: 'admin' | 'viewer', subject = 'sub-1') {
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject, role, displayName: 'Oidc User' })
    return user
  }

  async function oidcToken(user: { id: string, username: string, role: string, oidc_session_version: number }) {
    return tokenFor(user, buildOidcSessionClaims(user, await oidcConfigRepository.get()))
  }

  async function localUser(username: string, role: 'admin' | 'viewer', password = 'password-123') {
    return seedLocalUser(prisma, { username, role, passwordHash: await hashPassword(password) })
  }

  const asUser = (u: { id: string, username: string, role: string }) => asCookie(tokenFor(u))

  describe('authentication basics', () => {
    it('rejects missing, garbage, wrong-secret and alg=none tokens with 401', async () => {
      const u = await localUser('admin', 'admin')
      expect((await dispatch({ path: '/api/sites' })).status).toBe(401)
      expect((await dispatch({ path: '/api/sites', cookies: asCookie('garbage') })).status).toBe(401)
      const forged = jwt.sign({ sub: u.id, username: u.username, role: 'admin' }, 'some-other-secret')
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(forged) })).status).toBe(401)
      const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: u.id, role: 'admin' })).toString('base64url')}.`
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(none) })).status).toBe(401)
      // Bearer header works too (same verification).
      const ok = await dispatch({ path: '/api/sites', headers: { authorization: `Bearer ${tokenFor(u)}` } })
      expect(ok.status).toBe(200)
    })

    it('reads the user from the DB on every request: deleted user → 401', async () => {
      const u = await localUser('gone', 'admin')
      await localUser('keeper', 'admin')
      const cookies = asUser(u)
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
      await prisma.user.delete({ where: { id: u.id } })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
    })

    it('uses the DB role and DB username, never the JWT claims', async () => {
      const v = await localUser('real_viewer', 'viewer')
      const staleAdminToken = tokenFor({ id: v.id, username: 'stale_name', role: 'admin' })
      const r = await dispatch({ path: '/api/sites', cookies: asCookie(staleAdminToken) })
      expect(r.status).toBe(200)
      expect(r.auth).toMatchObject({ userId: v.id, username: 'real_viewer', role: 'viewer', authProvider: 'local' })
      expect((await dispatch({ method: 'POST', path: '/api/sites', cookies: asCookie(staleAdminToken), body: { name: 'x' } })).status).toBe(403)

      // Demotion/promotion takes effect immediately on old tokens.
      const a = await localUser('real_admin', 'admin')
      const lowClaimToken = asCookie(tokenFor({ id: a.id, username: a.username, role: 'viewer' }))
      expect((await dispatch({ path: '/api/users', cookies: lowClaimToken })).status).toBe(200)
      await prisma.user.update({ where: { id: a.id }, data: { role: 'viewer' } })
      expect((await dispatch({ path: '/api/users', cookies: lowClaimToken })).status).toBe(403)
    })

    it('public paths stay reachable; GET /api/settings is public and has no OIDC data', async () => {
      await enableOidc()
      for (const p of ['/api/auth/oidc/status', '/api/health', '/api/setup/status']) {
        expect((await dispatch({ path: p })).status, p).not.toBe(401)
      }
      const s = await dispatch({ path: '/api/settings' })
      expect(s.status).toBe(200)
      const text = JSON.stringify(s.body).toLowerCase()
      expect(text).not.toContain('oidc')
      expect(text).not.toContain('ciphertext')
      expect(text).not.toContain('client_secret')
    })
  })

  describe('viewer is read-only; admin-only surfaces are denied', () => {
    it('denies every mutation for a viewer (incl. activity undo, settings, users, backups, OIDC config/check)', async () => {
      const viewer = await localUser('viewer', 'viewer')
      const cookies = asUser(viewer)
      const writes: Array<[string, string, unknown?]> = [
        ['POST', '/api/sites', { name: 'x' }],
        ['PUT', '/api/settings', { app_name: 'x' }],
        ['POST', '/api/users', { username: 'new_user', display_name: 'N', password: 'password-123', role: 'admin' }],
        ['DELETE', `/api/users/${UUID_OTHER}`],
        ['PUT', `/api/users/${UUID_OTHER}`, { display_name: 'x' }],
        ['PUT', `/api/users/${UUID_OTHER}/password`, { current_password: 'a', new_password: 'password-123' }],
        ['POST', `/api/activity/${UUID_OTHER}/undo`],
        ['PUT', '/api/auth/oidc/config', { enabled: true }],
        ['POST', '/api/auth/oidc/check'],
        ['POST', '/api/backup/import', { schema: 'sqlite-v1', data: {} }]
      ]
      for (const [method, path, body] of writes) {
        const r = await dispatch({ method, path, cookies, body })
        expect(r.status, `${method} ${path}`).toBe(403)
      }
      expect(await prisma.user.count()).toBe(1)
    })

    it('denies admin-only reads for a viewer but allows ordinary reads and own user', async () => {
      const viewer = await localUser('viewer', 'viewer')
      await localUser('other', 'admin')
      const other = (await prisma.user.findUnique({ where: { username: 'other' } }))!
      const cookies = asUser(viewer)
      for (const p of ['/api/users', '/api/backup/export', '/api/auth/oidc/config', `/api/users/${other.id}`]) {
        expect((await dispatch({ path: p, cookies })).status, p).toBe(403)
      }
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
      const self = await dispatch({ path: `/api/users/${viewer.id}`, cookies })
      expect(self.status).toBe(200)
      expect(self.body).toMatchObject({ username: 'viewer' })
      expect(JSON.stringify(self.body)).not.toContain('password_hash')
    })

    it('viewers may update only their own display_name/language; role injection is 400', async () => {
      const viewer = await localUser('viewer', 'viewer')
      const cookies = asUser(viewer)
      const ok = await dispatch({ method: 'PUT', path: `/api/users/${viewer.id}`, cookies, body: { display_name: 'New Name', language: 'de' } })
      expect(ok.status).toBe(200)
      expect(ok.body).toMatchObject({ display_name: 'New Name', language: 'de', role: 'viewer' })
      for (const body of [{ role: 'admin' }, { display_name: 'x', role: 'admin' }, { username: 'hacker' }, { is_setup_user: true }, { auth_provider: 'oidc' }]) {
        const r = await dispatch({ method: 'PUT', path: `/api/users/${viewer.id}`, cookies, body })
        expect(r.status, JSON.stringify(body)).toBe(400)
      }
      expect((await prisma.user.findUnique({ where: { id: viewer.id } }))?.role).toBe('viewer')
    })

    it('viewers may change their own local password but nobody else\'s; logout is allowed', async () => {
      const viewer = await localUser('viewer', 'viewer', 'old-password-1')
      const other = await localUser('other', 'viewer', 'other-password-1')
      const cookies = asUser(viewer)
      const ok = await dispatch({ method: 'PUT', path: `/api/users/${viewer.id}/password`, cookies, body: { current_password: 'old-password-1', new_password: 'new-password-2' } })
      expect(ok.status).toBe(200)
      const foreign = await dispatch({ method: 'PUT', path: `/api/users/${other.id}/password`, cookies, body: { current_password: 'other-password-1', new_password: 'hijacked-pass-3' } })
      expect(foreign.status).toBe(403)
      const logout = await dispatch({ method: 'POST', path: '/api/auth/logout', cookies })
      expect(logout.status).toBe(200)
      expect(logout.deletedCookies).toContain('ezswm_token')
    })

    it('admins keep full access (users list, oidc config, backup export)', async () => {
      const a = await localUser('admin', 'admin')
      const cookies = asUser(a)
      for (const p of ['/api/users', '/api/auth/oidc/config', '/api/backup/export']) {
        expect((await dispatch({ path: p, cookies })).status, p).toBe(200)
      }
    })
  })

  describe('inventory export vs. full backup', () => {
    it('GET /api/data/export is viewer-readable and leaks no users, hashes, OIDC secrets or transactions', async () => {
      const viewer = await localUser('viewer', 'viewer')
      await localUser('root', 'admin')
      await oidcUser('viewer')
      await enableOidc()
      const cfg = await oidcConfigRepository.get()
      await prisma.oidcLoginTxn.create({ data: { id: 'txn1', state_hash: 'statehash-marker', nonce: 'nonce-marker', code_verifier: 'verifier-marker', binding_hash: 'bind', config_revision: cfg.config_revision, expires_at: new Date(Date.now() + 60000).toISOString(), created_at: new Date().toISOString() } as never })
      const r = await dispatch({ path: '/api/data/export', cookies: asUser(viewer) })
      expect(r.status).toBe(200)
      const text = JSON.stringify(r.body)
      const data = (r.body as { data: Record<string, unknown> }).data
      expect(data).not.toHaveProperty('users')
      expect(data).not.toHaveProperty('oidcConfig')
      expect(data).not.toHaveProperty('oidcLoginTxn')
      for (const secret of ['password_hash', 'client_secret', cfg.client_secret_ciphertext!, 'the-client-secret', KEY_B64, 'statehash-marker', 'verifier-marker', '$2a$']) {
        expect(text, secret).not.toContain(secret)
      }
    })

    it('GET /api/backup/export (admin) carries the ciphertext only: no plaintext, no key, no transactions', async () => {
      const a = await localUser('root', 'admin')
      await enableOidc()
      await prisma.oidcLoginTxn.create({ data: { id: 'txn1', state_hash: 'statehash-marker', nonce: 'nonce-marker', code_verifier: 'verifier-marker', binding_hash: 'bind', config_revision: 1, expires_at: new Date(Date.now() + 60000).toISOString(), created_at: new Date().toISOString() } as never })
      const r = await dispatch({ path: '/api/backup/export', cookies: asUser(a) })
      expect(r.status).toBe(200)
      const text = JSON.stringify(r.body)
      const cfg = await oidcConfigRepository.get()
      expect(text).toContain(cfg.client_secret_ciphertext!)
      for (const nope of ['the-client-secret', KEY_B64, getTestRuntimeConfig().jwtSecret, 'statehash-marker', 'verifier-marker', 'nonce-marker']) {
        expect(text, nope).not.toContain(nope)
      }
      expect((r.body as { data: Record<string, unknown> }).data).not.toHaveProperty('oidcLoginTxn')
    })
  })

  describe('OIDC sessions', () => {
    it('a valid OIDC session works and DB role is authoritative (mapping change demotes immediately)', async () => {
      await enableOidc()
      const u = await oidcUser('admin')
      const token = await oidcToken(u)
      const cookies = asCookie(token)
      expect((await dispatch({ path: '/api/users', cookies })).status).toBe(200)
      await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'sub-1', role: 'viewer', displayName: 'Oidc User' })
      expect((await dispatch({ path: '/api/users', cookies })).status).toBe(403)
      expect((await dispatch({ method: 'POST', path: '/api/sites', cookies, body: { name: 'x' } })).status).toBe(403)
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
    })

    it('dies (401) after a config revision change', async () => {
      await enableOidc()
      const cookies = asCookie(await oidcToken(await oidcUser('admin')))
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
      await oidcConfigRepository.update({ admin_groups: ['admins', 'more'] })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
    })

    it('dies (401) after a session-version bump (validated mapping denial)', async () => {
      await enableOidc()
      const u = await oidcUser('admin')
      const cookies = asCookie(await oidcToken(u))
      await userRepository.invalidateOidcSessions(ISSUER, 'sub-1')
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
    })

    it('dies (401) when SSO is disabled, the key is missing/wrong, or the user is deleted', async () => {
      await enableOidc()
      const admin = await localUser('root', 'admin')
      const u = await oidcUser('admin')
      const cookies = asCookie(await oidcToken(u))
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)

      setOidcRuntime({ oidcEncryptionKey: '' })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
      setOidcRuntime({ oidcEncryptionKey: randomBytes(32).toString('base64') })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
      // …while local login sessions are unaffected by the broken SSO state.
      expect((await dispatch({ path: '/api/sites', cookies: asUser(admin) })).status).toBe(200)
      expect((await dispatch({ path: '/api/users', cookies: asUser(admin) })).status).toBe(200)

      setOidcRuntime({ oidcEncryptionKey: KEY_B64 })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
      await prisma.oidcConfig.updateMany({ data: { enabled: false } })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
      await prisma.oidcConfig.updateMany({ data: { enabled: true } })
      await prisma.user.delete({ where: { id: u.id } })
      expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(401)
    })

    it('rejects provenance mismatches: OIDC user with a plain token, local user with an OIDC-claim token', async () => {
      await enableOidc()
      const u = await oidcUser('admin')
      expect((await dispatch({ path: '/api/sites', cookies: asUser(u) })).status).toBe(401)
      const local = await localUser('root', 'admin')
      const cfg = await oidcConfigRepository.get()
      const spoofed = tokenFor(local, { ap: 'oidc', osv: 0, orev: cfg.config_revision })
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(spoofed) })).status).toBe(401)
    })

    it('signToken keeps the local API and preserves OIDC extras', () => {
      const plain = jwt.decode(signToken({ sub: 'u', username: 'n', role: 'admin' })) as Record<string, unknown>
      expect(plain).toMatchObject({ sub: 'u', username: 'n', role: 'admin' })
      expect(plain).not.toHaveProperty('ap')
      const oidc = jwt.decode(signToken({ sub: 'u', username: 'n', role: 'viewer', ap: 'oidc', osv: 3, orev: 7 })) as Record<string, unknown>
      expect(oidc).toMatchObject({ ap: 'oidc', osv: 3, orev: 7 })
    })
  })

  describe('user-management invariants through the real routes', () => {
    it('manual role changes of OIDC users are 409; OIDC users have no password', async () => {
      await enableOidc()
      const admin = await localUser('root', 'admin')
      const u = await oidcUser('viewer')
      const role = await dispatch({ method: 'PUT', path: `/api/users/${u.id}`, cookies: asUser(admin), body: { role: 'admin' } })
      expect(role.status).toBe(409)
      const pw = await dispatch({ method: 'PUT', path: `/api/users/${u.id}/password`, cookies: asUser(admin), body: { current_password: 'x', new_password: 'password-123' } })
      expect(pw.status).toBe(403)
      expect((await prisma.user.findUnique({ where: { id: u.id } }))?.role).toBe('viewer')
    })

    it('the last local admin cannot be deleted or demoted (even by an OIDC admin)', async () => {
      await enableOidc()
      const local = await localUser('emergency', 'admin')
      const oidcAdmin = await oidcUser('admin')
      const cookies = asCookie(await oidcToken(oidcAdmin))
      const del = await dispatch({ method: 'DELETE', path: `/api/users/${local.id}`, cookies })
      expect(del.status).toBe(409)
      const demote = await dispatch({ method: 'PUT', path: `/api/users/${local.id}`, cookies, body: { role: 'viewer' } })
      expect(demote.status).toBe(409)
      expect((await prisma.user.findUnique({ where: { id: local.id } }))?.role).toBe('admin')
    })

    it('GET /api/users never exposes password hashes', async () => {
      const a = await localUser('root', 'admin')
      await oidcUser('viewer')
      const r = await dispatch({ path: '/api/users', cookies: asUser(a) })
      expect(JSON.stringify(r.body)).not.toContain('password_hash')
      expect(JSON.stringify(r.body)).not.toContain('$2')
    })
  })

  describe('path normalization (no public-prefix bypass, no policy evasion)', () => {
    it('normalizePolicyPath resolves dots, encodings, duplicate and back slashes', () => {
      const cases: Array<[string, string]> = [
        ['/api/users/../users', '/api/users'],
        ['/api//users', '/api/users'],
        ['/api/%75sers', '/api/users'],
        ['/api/%2575sers', '/api/users'],
        ['/api/auth/oidc/./config', '/api/auth/oidc/config'],
        ['/api/auth/oidc/%63onfig/', '/api/auth/oidc/config'],
        ['/api/auth/oidc/start/../config', '/api/auth/oidc/config'],
        ['/api\\users', '/api/users'],
        ['/api/users?x=1#f', '/api/users'],
        ['/api/%zz', '/__invalid__']
      ]
      for (const [raw, expected] of cases) expect(normalizePolicyPath(raw), raw).toBe(expected)
    })

    it('anonymous requests that normalize to a protected path are 401 (public routes cannot shelter others)', async () => {
      for (const p of [
        '/api/auth/oidc/start/../config',
        '/api/auth/oidc/callback/../check',
        '/api/auth/oidc/status/../../users',
        '/api/p/../users',
        '/api/health/../backup/export',
        '/api/auth/oidc/%63onfig',
        '/api/auth/oidc/statusx',
        '/api/auth/oidc/start/extra',
        '/api/auth/oidc'
      ]) {
        expect((await dispatch({ path: p })).status, p).toBe(401)
      }
    })

    it('viewers cannot reach admin-only routes via encoded / traversal / trailing-slash variants', async () => {
      const cookies = asUser(await localUser('viewer', 'viewer'))
      for (const p of [
        '/api/users/../users',
        '/api//users',
        '/api/%75sers',
        '/api/auth/oidc/%63onfig',
        '/api/auth/oidc/config/',
        '/api/auth/oidc/./config',
        '/api/auth/oidc/start/../config',
        '/api/BACKUP/export'.toLowerCase(),
        '/api/backup/../backup/export'
      ]) {
        expect((await dispatch({ path: p, cookies })).status, p).toBe(403)
      }
    })

    it('evaluateRolePolicy: viewer matrix is exact (own-profile only, no foreign ids, no prefix sloppiness)', () => {
      const v = { role: 'viewer', userId: 'me' }
      expect(evaluateRolePolicy({ ...v, method: 'PUT', path: '/api/users/me' })).toBe('allow')
      expect(evaluateRolePolicy({ ...v, method: 'PUT', path: '/api/users/me/password' })).toBe('allow')
      expect(evaluateRolePolicy({ ...v, method: 'DELETE', path: '/api/users/me' })).toBe('forbidden')
      expect(evaluateRolePolicy({ ...v, method: 'PUT', path: '/api/users/you' })).toBe('forbidden')
      expect(evaluateRolePolicy({ ...v, method: 'GET', path: '/api/users/me/extra' })).toBe('forbidden')
      expect(evaluateRolePolicy({ ...v, method: 'GET', path: '/api/usersx' })).toBe('allow') // not the users prefix
      expect(evaluateRolePolicy({ ...v, method: 'POST', path: '/api/auth/logout' })).toBe('allow')
      expect(evaluateRolePolicy({ ...v, method: 'POST', path: '/api/sites' })).toBe('forbidden')
      expect(evaluateRolePolicy({ role: 'unknown', userId: 'me', method: 'GET', path: '/api/sites' })).toBe('forbidden')
      expect(evaluateRolePolicy({ role: 'admin', userId: 'me', method: 'DELETE', path: '/api/users/you' })).toBe('allow')
    })
  })
})
