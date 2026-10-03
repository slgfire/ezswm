import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'
import { restoreAll } from '../server/utils/dataRestore'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { userRepository } from '../server/repositories/userRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const OTHER_KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'
const TS = '2026-01-01T00:00:00Z'
const HASH = '$2a$10$fixturehashfixturehashfixturehashfixturehashfixtureha'

const settingsRow = () => ({
  id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null,
  default_port_status: 'down', port_speeds: JSON.stringify(['1G']), setup_completed: true, sites_initialized: true
})
const localAdminRow = (over: Record<string, unknown> = {}) => ({
  id: randomUUID(), username: 'admin', display_name: 'Admin', password_hash: HASH, role: 'admin',
  language: 'en', is_setup_user: true, created_at: TS, updated_at: TS, ...over
})
const oidcUserRow = (over: Record<string, unknown> = {}) => ({
  id: randomUUID(), username: 'oidc_abc', display_name: 'O', password_hash: null, role: 'viewer', language: 'en',
  is_setup_user: false, created_at: TS, updated_at: TS, auth_provider: 'oidc', oidc_issuer: ISSUER, oidc_subject: 'sub-1',
  oidc_session_version: 0, ...over
})
const payload = (data: Record<string, unknown[]>) => ({ schema: 'sqlite-v1', data: { settings: [settingsRow()], ...data } })

describe('backup/restore with OIDC (restoreAll + real import/export routes)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  const key = () => parseOidcEncryptionKey(KEY_B64)

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

  const oidcCfgRow = (over: Record<string, unknown> = {}) => ({
    id: 'singleton', enabled: true, issuer: ISSUER, client_id: 'cid',
    client_secret_ciphertext: encryptOidcSecret('the-client-secret', key()),
    scopes: JSON.stringify(['openid', 'profile']), groups_claim: 'groups',
    admin_groups: JSON.stringify(['admins']), viewer_groups: JSON.stringify([]),
    allow_unmatched_viewer: false, allow_http_issuer: false, observed_groups: JSON.stringify([]),
    config_revision: 4, updated_at: TS, ...over
  })

  async function seedPendingTxn(revision = 1) {
    await prisma.oidcLoginTxn.create({
      data: { id: randomUUID(), state_hash: randomUUID(), nonce: 'n', code_verifier: 'v', binding_hash: 'b', config_revision: revision, created_at: TS, expires_at: new Date(Date.now() + 600000).toISOString() }
    })
  }

  describe('user integrity', () => {
    it('legacy backups (no OIDC columns) restore as local users with defaults', async () => {
      const legacy = localAdminRow()
      const res = await restoreAll(prisma, payload({ users: [legacy] }))
      expect(res.inserted.users).toBe(1)
      const row = await prisma.user.findUnique({ where: { id: legacy.id as string } })
      expect(row).toMatchObject({ auth_provider: 'local', oidc_issuer: null, oidc_subject: null, oidc_session_version: 0, password_hash: HASH })
    })

    it('restores OIDC users (no hash) next to the mandatory local admin', async () => {
      const res = await restoreAll(prisma, payload({ users: [localAdminRow(), oidcUserRow({ oidc_session_version: 3 })] }))
      expect(res.inserted.users).toBe(2)
      const o = await userRepository.getByOidcIdentity(ISSUER, 'sub-1')
      expect(o).toMatchObject({ auth_provider: 'oidc', password_hash: null, oidc_session_version: 3 })
    })

    it('rejects payloads that would leave no local admin, before ANY write (existing data untouched)', async () => {
      const keep = await seedLocalUser(prisma, { username: 'keep', role: 'admin' })
      await seedPendingTxn()
      const bads: Array<[string, Record<string, unknown[]>]> = [
        ['no users key', {}],
        ['empty users', { users: [] }],
        ['viewer only', { users: [localAdminRow({ role: 'viewer' })] }],
        ['OIDC admin only', { users: [oidcUserRow({ role: 'admin' })] }],
        ['local admin with empty hash', { users: [localAdminRow({ password_hash: '' })] }],
        ['local admin with null hash', { users: [localAdminRow({ password_hash: null })] }]
      ]
      for (const [label, data] of bads) {
        await expect(restoreAll(prisma, payload(data)), label).rejects.toMatchObject({ statusCode: 400 })
      }
      expect(await prisma.user.findUnique({ where: { id: keep.id } })).toBeTruthy()
      expect(await prisma.user.count()).toBe(1)
      expect(await prisma.oidcLoginTxn.count()).toBe(1)
    })

    it('rejects invalid OIDC identity / hash / provider combinations', async () => {
      const bads: Array<[string, Record<string, unknown>]> = [
        ['oidc without issuer', oidcUserRow({ oidc_issuer: null })],
        ['oidc without subject', oidcUserRow({ oidc_subject: '' })],
        ['oidc with password hash', oidcUserRow({ password_hash: HASH })],
        ['unknown provider', oidcUserRow({ auth_provider: 'saml' })],
        ['local with oidc identity', localAdminRow({ oidc_issuer: ISSUER, oidc_subject: 'x' })],
        ['negative session version', oidcUserRow({ oidc_session_version: -1 })],
        ['bad role', oidcUserRow({ role: 'root' })]
      ]
      for (const [label, row] of bads) {
        await expect(restoreAll(prisma, payload({ users: [localAdminRow(), row] })), label).rejects.toMatchObject({ statusCode: 400 })
      }
      await expect(restoreAll(prisma, payload({ users: [localAdminRow(), oidcUserRow(), oidcUserRow({ username: 'oidc_dup' })] })))
        .rejects.toMatchObject({ statusCode: 400 }) // duplicate (issuer, subject)
      expect(await prisma.user.count()).toBe(0)
    })

    it('rejects malformed OIDC config rows', async () => {
      const users = [localAdminRow()]
      await expect(restoreAll(prisma, payload({ users, oidcConfig: [oidcCfgRow(), oidcCfgRow()] }))).rejects.toMatchObject({ statusCode: 400 })
      await expect(restoreAll(prisma, payload({ users, oidcConfig: [oidcCfgRow({ admin_groups: 'not-json-array' })] }))).rejects.toMatchObject({ statusCode: 400 })
      await expect(restoreAll(prisma, payload({ users, oidcConfig: [oidcCfgRow({ scopes: JSON.stringify([1, 2]) })] }))).rejects.toMatchObject({ statusCode: 400 })
      expect(await prisma.user.count()).toBe(0)
    })
  })

  describe('OIDC config + transactions on restore', () => {
    it('purges pending transactions (and never restores any from the payload)', async () => {
      await seedPendingTxn()
      await seedPendingTxn()
      const p = payload({ users: [localAdminRow()], oidcConfig: [oidcCfgRow()] })
      ;(p.data as Record<string, unknown>).oidcLoginTxn = [{ id: randomUUID(), state_hash: 'smuggled', nonce: 'n', code_verifier: 'v', binding_hash: 'b', config_revision: 99, created_at: TS, expires_at: '2099-01-01T00:00:00Z' }]
      await restoreAll(prisma, p, { oidcKey: key() })
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
    })

    it('bumps the revision above BOTH the prior and the restored one, invalidating prior SSO sessions', async () => {
      await oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
      await oidcConfigRepository.update({ scopes: ['openid', 'email'] })
      await oidcConfigRepository.update({ scopes: ['openid', 'groups'] })
      const prior = await oidcConfigRepository.get()
      expect(prior.config_revision).toBeGreaterThanOrEqual(3)
      const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'sub-1', role: 'admin', displayName: 'O' })
      const oldToken = tokenFor(user, buildOidcSessionClaims(user, prior))
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(oldToken) })).status).toBe(200)

      // Backup taken "earlier" with a LOWER revision than the live prior one and the SAME OIDC user.
      await restoreAll(prisma, payload({
        users: [localAdminRow(), oidcUserRow({ id: user.id, username: user.username, role: 'admin', oidc_subject: 'sub-1' })],
        oidcConfig: [oidcCfgRow({ config_revision: 1 })]
      }), { oidcKey: key() })
      const after = await oidcConfigRepository.get()
      expect(after.config_revision).toBeGreaterThan(prior.config_revision)
      expect(after.config_revision).toBeGreaterThan(1)
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(oldToken) })).status).toBe(401)
    })

    it('restoring into an empty DB takes max(prior, restored)+1', async () => {
      await restoreAll(prisma, payload({ users: [localAdminRow()], oidcConfig: [oidcCfgRow({ config_revision: 9 })] }), { oidcKey: key() })
      expect((await oidcConfigRepository.get()).config_revision).toBe(10)
    })

    it('restores a decryptable secret as enabled and usable', async () => {
      const res = await restoreAll(prisma, payload({ users: [localAdminRow()], oidcConfig: [oidcCfgRow()] }), { oidcKey: key() })
      expect(res.oidcDisabledUndecryptable).toBe(false)
      const cfg = await oidcConfigRepository.get()
      expect(cfg).toMatchObject({ enabled: true, issuer: ISSUER })
      const status = await dispatch({ path: '/api/auth/oidc/status' })
      expect(status.body).toEqual({ enabled: true })
    })

    it('an undecryptable secret (foreign key) disables SSO but keeps ciphertext; local login still works', async () => {
      const foreign = encryptOidcSecret('foreign-secret', parseOidcEncryptionKey(OTHER_KEY_B64))
      const admin = localAdminRow()
      const res = await restoreAll(prisma, payload({ users: [admin], oidcConfig: [oidcCfgRow({ client_secret_ciphertext: foreign })] }), { oidcKey: key() })
      expect(res.oidcDisabledUndecryptable).toBe(true)
      const cfg = await oidcConfigRepository.get()
      expect(cfg.enabled).toBe(false)
      expect(cfg.client_secret_ciphertext).toBe(foreign)
      expect((await dispatch({ path: '/api/auth/oidc/status' })).body).toEqual({ enabled: false })
      const local = await dispatch({ path: '/api/sites', cookies: asCookie(tokenFor({ id: admin.id, username: 'admin', role: 'admin' })) })
      expect(local.status).toBe(200)
    })

    it('no usable key at restore time also disables SSO when a secret is present; secret-less (public client) stays enabled', async () => {
      const a = await restoreAll(prisma, payload({ users: [localAdminRow()], oidcConfig: [oidcCfgRow()] }), { oidcKey: null })
      expect(a.oidcDisabledUndecryptable).toBe(true)
      expect((await oidcConfigRepository.get()).enabled).toBe(false)
      const b = await restoreAll(prisma, payload({ users: [localAdminRow()], oidcConfig: [oidcCfgRow({ client_secret_ciphertext: null })] }), { oidcKey: null })
      expect(b.oidcDisabledUndecryptable).toBe(false)
      expect((await oidcConfigRepository.get()).enabled).toBe(true)
    })

    it('is atomic: a late FK failure rolls back users, config and transaction purge', async () => {
      const keep = await seedLocalUser(prisma, { username: 'keep', role: 'admin' })
      await oidcConfigRepository.update({ issuer: ISSUER, client_id: 'keep-client' })
      const before = await oidcConfigRepository.get()
      await seedPendingTxn(before.config_revision)
      const bad = payload({
        users: [localAdminRow(), oidcUserRow()],
        oidcConfig: [oidcCfgRow()],
        networks: [{ id: randomUUID(), site_id: randomUUID(), slug: 'n', name: 'n', vlan_id: null, subnet: '10.0.0.0/24', gateway: null, dns_servers: '[]', description: null, is_favorite: false, created_at: TS, updated_at: TS }]
      })
      await expect(restoreAll(prisma, bad, { oidcKey: key() })).rejects.toThrow()
      expect(await prisma.user.findUnique({ where: { id: keep.id } })).toBeTruthy()
      expect(await prisma.user.count()).toBe(1)
      expect((await oidcConfigRepository.get()).client_id).toBe('keep-client')
      expect((await oidcConfigRepository.get()).config_revision).toBe(before.config_revision)
      expect(await prisma.oidcLoginTxn.count()).toBe(1)
    })
  })

  describe('export → import round trip through the real routes', () => {
    it('exports ciphertext only and re-imports it (SSO stays enabled with the same key)', async () => {
      const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      await oidcConfigRepository.update({
        enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'],
        client_secret_ciphertext: encryptOidcSecret('the-client-secret', key())
      })
      await seedPendingTxn()
      const cookies = asCookie(tokenFor(admin))
      const exp = await dispatch({ path: '/api/backup/export', cookies })
      const text = JSON.stringify(exp.body)
      expect(text).not.toContain('the-client-secret')
      expect(text).not.toContain(KEY_B64)
      const before = await oidcConfigRepository.get()

      const imp = await dispatch({ method: 'POST', path: '/api/backup/import', cookies, body: exp.body })
      expect(imp.status, JSON.stringify(imp.error)).toBe(200)
      expect(imp.body).toMatchObject({ success: true })
      expect(imp.body).not.toHaveProperty('warnings')
      const after = await oidcConfigRepository.get()
      expect(after.enabled).toBe(true)
      expect(after.config_revision).toBeGreaterThan(before.config_revision)
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
    })

    it('import under a different key reports the warning and disables SSO', async () => {
      const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      await oidcConfigRepository.update({
        enabled: true, issuer: ISSUER, client_id: 'cid',
        client_secret_ciphertext: encryptOidcSecret('the-client-secret', key())
      })
      const cookies = asCookie(tokenFor(admin))
      const exp = await dispatch({ path: '/api/backup/export', cookies })
      setOidcRuntime({ oidcEncryptionKey: OTHER_KEY_B64 })
      const imp = await dispatch({ method: 'POST', path: '/api/backup/import', cookies: asCookie(tokenFor(admin)), body: exp.body })
      expect(imp.status).toBe(200)
      expect(imp.body).toMatchObject({ warnings: ['oidc_disabled_secret_undecryptable'] })
      expect((await oidcConfigRepository.get()).enabled).toBe(false)
    })

    it('import route refuses a no-admin backup with 400 and changes nothing', async () => {
      const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      const r = await dispatch({ method: 'POST', path: '/api/backup/import', cookies: asCookie(tokenFor(admin)), body: payload({ users: [oidcUserRow({ role: 'admin' })] }) })
      expect(r.status).toBe(400)
      expect(await prisma.user.count()).toBe(1)
    })
  })
})
