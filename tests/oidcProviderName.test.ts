import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'
import { clearOidcClientCache } from '../server/utils/oidc/client'
import { restoreAll } from '../server/utils/dataRestore'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { userRepository } from '../server/repositories/userRepository'
import { oidcConfigUpdateSchema, providerNameSchema } from '../server/validators/oidcSchemas'

const KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'
const TS = '2026-01-01T00:00:00Z'
const HASH = '$2a$10$fixturehashfixturehashfixturehashfixturehashfixtureha'
const SECRET = 'branding-test-client-secret'

describe('providerNameSchema', () => {
  const ok = (v: unknown) => {
    const r = providerNameSchema.safeParse(v)
    expect(r.success, String(v)).toBe(true)
    return r.success ? r.data : undefined
  }
  const rejected = (v: unknown) => expect(providerNameSchema.safeParse(v).success, JSON.stringify(v)).toBe(false)

  it('trims, maps blank/whitespace to null, keeps null', () => {
    expect(ok('  SaarAuth  ')).toBe('SaarAuth')
    expect(ok('')).toBeNull()
    expect(ok('   \t ')).toBeNull()
    expect(ok(null)).toBeNull()
  })

  it('omitted field stays undefined at the update-schema level (retain)', () => {
    const r = oidcConfigUpdateSchema.parse({})
    expect('provider_name' in r).toBe(false)
    expect(oidcConfigUpdateSchema.parse({ provider_name: '  x ' }).provider_name).toBe('x')
    expect(oidcConfigUpdateSchema.parse({ provider_name: null }).provider_name).toBeNull()
  })

  it('accepts exactly 64 characters (after trim) and rejects 65', () => {
    expect(ok('a'.repeat(64))).toBe('a'.repeat(64))
    expect(ok(` ${'a'.repeat(64)} `)).toBe('a'.repeat(64))
    rejected('a'.repeat(65))
  })

  it('rejects ASCII control characters (incl. inner newline/tab/NUL/DEL)', () => {
    for (const bad of ['a\nb', 'a\tb', 'a\u0000b', 'a\u001fb', 'a\u007fb']) rejected(bad)
  })

  it('accepts Unicode and HTML-looking text as plain text (no sanitising rewrite)', () => {
    expect(ok('Saar‑Auth Ünïcödé 日本語 🚀')).toBe('Saar‑Auth Ünïcödé 日本語 🚀')
    expect(ok('<b>x</b> & "y"')).toBe('<b>x</b> & "y"')
  })

  it('rejects non-string types', () => {
    for (const bad of [1, true, {}, [], ['a']]) rejected(bad)
  })
})

describe('OIDC provider_name (routes, repository, restore)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  const key = () => parseOidcEncryptionKey(KEY_B64)
  let adminCookie: Record<string, string>

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
    clearOidcClientCache()
    resetOidcRuntime()
    setOidcRuntime({ oidcEncryptionKey: KEY_B64, publicBaseUrl: '' })
    adminCookie = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
  })

  const put = (body: unknown, cookies = adminCookie) => dispatch({ method: 'PUT', path: '/api/auth/oidc/config', cookies, body })
  const getCfg = () => dispatch({ path: '/api/auth/oidc/config', cookies: adminCookie })
  const status = () => dispatch({ path: '/api/auth/oidc/status' })
  const rawRow = () => prisma.oidcConfig.findUniqueOrThrow({ where: { id: 'singleton' } })

  async function seedPendingTxn(revision: number) {
    await prisma.oidcLoginTxn.create({
      data: { id: randomUUID(), state_hash: randomUUID(), nonce: 'n', code_verifier: 'v', binding_hash: 'b', config_revision: revision, created_at: TS, expires_at: new Date(Date.now() + 600000).toISOString() }
    })
  }
  const configureBase = (over: Record<string, unknown> = {}) => oidcConfigRepository.update({
    enabled: true, issuer: ISSUER, client_id: 'cid',
    client_secret_ciphertext: encryptOidcSecret(SECRET, key()), admin_groups: ['admins'], ...over
  })

  describe('PUT normalisation and admin-only exposure', () => {
    it('trims, stores, returns in admin DTO; blank/null clear; omission retains', async () => {
      const a = await put({ provider_name: '  SaarAuth  ' })
      expect(a.status).toBe(200)
      expect((a.body as { provider_name: string }).provider_name).toBe('SaarAuth')
      expect((await rawRow()).provider_name).toBe('SaarAuth')
      expect((await getCfg()).body).toMatchObject({ provider_name: 'SaarAuth' })

      const retained = await put({ scopes: ['openid', 'profile', 'email'] })
      expect((retained.body as { provider_name: string }).provider_name).toBe('SaarAuth')

      const blank = await put({ provider_name: '   ' })
      expect((blank.body as { provider_name: unknown }).provider_name).toBeNull()
      expect((await rawRow()).provider_name).toBeNull()

      await put({ provider_name: 'Again' })
      const cleared = await put({ provider_name: null })
      expect((cleared.body as { provider_name: unknown }).provider_name).toBeNull()
    })

    it('rejects control characters, 65 chars and wrong types with 400 and stores nothing', async () => {
      for (const bad of ['a\nb', 'a'.repeat(65), 12, ['x'], { a: 1 }, true]) {
        const r = await put({ provider_name: bad })
        expect(r.status, JSON.stringify(bad)).toBe(400)
      }
      expect(await prisma.oidcConfig.count()).toBe(0)
    })

    it('is admin-only (viewer 403, anonymous 401) and the DTO never leaks the secret', async () => {
      const viewer = await seedLocalUser(prisma, { username: 'view', role: 'viewer' })
      expect((await put({ provider_name: 'X' }, asCookie(tokenFor(viewer)))).status).toBe(403)
      expect((await put({ provider_name: 'X' }, {})).status).toBe(401)
      expect((await dispatch({ path: '/api/auth/oidc/config', cookies: asCookie(tokenFor(viewer)) })).status).toBe(403)
      await configureBase()
      const r = await put({ provider_name: 'SaarAuth' })
      const text = JSON.stringify(r.body)
      expect(text).not.toContain(SECRET)
      expect(text).not.toContain('ciphertext')
      expect(text).not.toContain(KEY_B64)
    })

    it('a mixed name + policy change retains normal security invalidation', async () => {
      await configureBase({ provider_name: 'Old' })
      const before = await oidcConfigRepository.get()
      await seedPendingTxn(before.config_revision)
      const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 's1', role: 'admin', displayName: 'O' })
      const token = tokenFor(user, buildOidcSessionClaims(user, before))
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(token) })).status).toBe(200)

      const r = await put({ provider_name: 'New', admin_groups: ['admins', 'ops'] })
      expect(r.status).toBe(200)
      expect((r.body as { config_revision: number }).config_revision).toBe(before.config_revision + 1)
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(token) })).status).toBe(401)
      expect((await oidcConfigRepository.get()).provider_name).toBe('New')
    })

    it('mixed name + credential (secret replace) change also bumps the revision and purges transactions', async () => {
      await configureBase()
      const before = await oidcConfigRepository.get()
      await seedPendingTxn(before.config_revision)
      const r = await put({ provider_name: 'Cred', client_secret: 'replacement-secret' })
      expect(r.status).toBe(200)
      expect((r.body as { config_revision: number }).config_revision).toBe(before.config_revision + 1)
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
    })

    it('does not touch observed groups', async () => {
      await configureBase()
      await oidcConfigRepository.recordObservedGroups(['g-a', 'g-b'])
      const before = (await oidcConfigRepository.get()).observed_groups
      await put({ provider_name: 'X' })
      expect((await oidcConfigRepository.get()).observed_groups).toEqual(before)
      expect(before.length).toBeGreaterThan(0)
    })
  })

  describe('cosmetic-only repository semantics', () => {
    it('name-only change keeps revision, pending txns and existing OIDC sessions; updates updated_at', async () => {
      await configureBase()
      const before = await oidcConfigRepository.get()
      await seedPendingTxn(before.config_revision)
      await seedPendingTxn(before.config_revision)
      const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 's1', role: 'admin', displayName: 'O' })
      const token = tokenFor(user, buildOidcSessionClaims(user, before))
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(token) })).status).toBe(200)

      await new Promise(r => setTimeout(r, 5))
      const res = await oidcConfigRepository.update({ provider_name: 'SaarAuth' })
      expect(res.changed).toBe(true)
      expect(res.config.config_revision).toBe(before.config_revision)
      expect(res.config.updated_at).not.toBe(before.updated_at)
      expect(await prisma.oidcLoginTxn.count()).toBe(2)
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(token) })).status).toBe(200)

      const cleared = await oidcConfigRepository.update({ provider_name: null })
      expect(cleared.config.config_revision).toBe(before.config_revision)
      expect(await prisma.oidcLoginTxn.count()).toBe(2)
      expect((await dispatch({ path: '/api/sites', cookies: asCookie(token) })).status).toBe(200)
    })

    it('same-name / empty patches are no-ops that keep updated_at', async () => {
      await configureBase({ provider_name: 'SaarAuth' })
      const before = await rawRow()
      await new Promise(r => setTimeout(r, 5))
      const same = await oidcConfigRepository.update({ provider_name: 'SaarAuth' })
      const empty = await oidcConfigRepository.update({})
      expect(same.changed).toBe(false)
      expect(empty.changed).toBe(false)
      expect(await rawRow()).toEqual(before)
      const viaPut = await put({ provider_name: '  SaarAuth ' })
      expect(viaPut.status).toBe(200)
      expect(await rawRow()).toEqual(before)
    })

    it('name-only upsert on a never-configured install creates the row with revision 0 and defaults', async () => {
      expect(await prisma.oidcConfig.count()).toBe(0)
      const res = await oidcConfigRepository.update({ provider_name: 'First' })
      expect(res.changed).toBe(true)
      const row = await rawRow()
      expect(row).toMatchObject({ provider_name: 'First', config_revision: 0, enabled: false, issuer: null, client_id: null, client_secret_ciphertext: null })
      expect((await status()).body).toEqual({ enabled: false })
    })
  })

  describe('public status allow-list', () => {
    it('exposes only {enabled, provider_name} when effectively enabled and named', async () => {
      await configureBase({ provider_name: 'SaarAuth' })
      const r = await status()
      expect(r.status).toBe(200)
      expect(r.body).toEqual({ enabled: true, provider_name: 'SaarAuth' })
      const text = JSON.stringify(r.body)
      for (const leak of [ISSUER, 'cid', 'admins', SECRET, KEY_B64, 'ciphertext', 'revision', 'client']) expect(text).not.toContain(leak)
    })

    it('unbranded enabled stays exactly {enabled:true}', async () => {
      await configureBase()
      expect((await status()).body).toEqual({ enabled: true })
    })

    it('trimmed value from PUT is what is exposed; HTML-like text is returned verbatim as JSON data', async () => {
      await configureBase()
      await put({ provider_name: '  <b>Saar</b> Ünï  ' })
      expect((await status()).body).toEqual({ enabled: true, provider_name: '<b>Saar</b> Ünï' })
    })

    it('hides the name when SSO is disabled', async () => {
      await configureBase({ provider_name: 'SaarAuth', enabled: false })
      expect((await status()).body).toEqual({ enabled: false })
    })

    it('hides the name when not ready (missing / wrong key)', async () => {
      await configureBase({ provider_name: 'SaarAuth' })
      setOidcRuntime({ oidcEncryptionKey: '' })
      expect((await status()).body).toEqual({ enabled: false })
      setOidcRuntime({ oidcEncryptionKey: randomBytes(32).toString('base64') })
      expect((await status()).body).toEqual({ enabled: false })
    })

    it('hides the name when enabled but issuer/client incomplete (raw row)', async () => {
      await prisma.oidcConfig.create({ data: {
        id: 'singleton', enabled: true, issuer: null, client_id: null, scopes: '["openid"]', groups_claim: 'groups',
        admin_groups: '[]', viewer_groups: '[]', allow_unmatched_viewer: false, allow_http_issuer: false,
        observed_groups: '[]', provider_name: 'SaarAuth', config_revision: 1, updated_at: TS
      } })
      expect((await status()).body).toEqual({ enabled: false })
    })

    it('treats a blank name stored in the DB as unbranded', async () => {
      await configureBase()
      await prisma.oidcConfig.update({ where: { id: 'singleton' }, data: { provider_name: '   ' } })
      expect((await status()).body).toEqual({ enabled: true })
    })
  })

  describe('backup export / restore', () => {
    const settingsRow = () => ({
      id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null,
      default_port_status: 'down', port_speeds: JSON.stringify(['1G']), setup_completed: true, sites_initialized: true
    })
    const adminRow = (over: Record<string, unknown> = {}) => ({
      id: randomUUID(), username: 'admin', display_name: 'Admin', password_hash: HASH, role: 'admin',
      language: 'en', is_setup_user: true, created_at: TS, updated_at: TS, ...over
    })
    const cfgRow = (over: Record<string, unknown> = {}) => ({
      id: 'singleton', enabled: true, issuer: ISSUER, client_id: 'cid',
      client_secret_ciphertext: encryptOidcSecret(SECRET, key()),
      scopes: JSON.stringify(['openid', 'profile']), groups_claim: 'groups',
      admin_groups: JSON.stringify(['admins']), viewer_groups: JSON.stringify([]),
      allow_unmatched_viewer: false, allow_http_issuer: false, observed_groups: JSON.stringify([]),
      config_revision: 4, updated_at: TS, ...over
    })
    const payload = (data: Record<string, unknown[]>) => ({ schema: 'sqlite-v1', data: { settings: [settingsRow()], ...data } })

    it('restores a legacy row without provider_name as null', async () => {
      const row = cfgRow()
      expect('provider_name' in row).toBe(false)
      await restoreAll(prisma, payload({ users: [adminRow()], oidcConfig: [row] }), { oidcKey: key() })
      expect((await oidcConfigRepository.get()).provider_name).toBeNull()
      expect((await status()).body).toEqual({ enabled: true })
    })

    it('restore trims and blank-normalises valid names', async () => {
      await restoreAll(prisma, payload({ users: [adminRow()], oidcConfig: [cfgRow({ provider_name: '  SaarAuth ' })] }), { oidcKey: key() })
      expect((await oidcConfigRepository.get()).provider_name).toBe('SaarAuth')
      await restoreAll(prisma, payload({ users: [adminRow()], oidcConfig: [cfgRow({ provider_name: '   ' })] }), { oidcKey: key() })
      expect((await oidcConfigRepository.get()).provider_name).toBeNull()
      await restoreAll(prisma, payload({ users: [adminRow()], oidcConfig: [cfgRow({ provider_name: null })] }), { oidcKey: key() })
      expect((await oidcConfigRepository.get()).provider_name).toBeNull()
    })

    it('rejects invalid names atomically, leaving every pre-existing row unchanged', async () => {
      const keep = await seedLocalUser(prisma, { username: 'keep', role: 'admin' })
      await configureBase({ provider_name: 'Keep' })
      const before = await rawRow()
      await seedPendingTxn(before.config_revision)
      const usersBefore = await prisma.user.count()
      for (const bad of [123, true, ['a'], { a: 1 }, 'x\ny', 'a'.repeat(65)]) {
        await expect(restoreAll(prisma, payload({ users: [adminRow()], oidcConfig: [cfgRow({ provider_name: bad })] }), { oidcKey: key() }), JSON.stringify(bad))
          .rejects.toMatchObject({ statusCode: 400 })
      }
      expect(await rawRow()).toEqual(before)
      expect(await prisma.oidcLoginTxn.count()).toBe(1)
      expect(await prisma.user.count()).toBe(usersBefore)
      expect(await prisma.user.findUnique({ where: { id: keep.id } })).toBeTruthy()
    })

    it('raw export -> import round trip preserves the name and same config payload; revision bumps, txns purge', async () => {
      const admin = await seedLocalUser(prisma, { username: 'root2', role: 'admin' })
      await configureBase({ provider_name: 'SaarAuth' })
      await seedPendingTxn(1)
      const cookies = asCookie(tokenFor(admin))
      const exp = await dispatch({ path: '/api/backup/export', cookies })
      expect(exp.status).toBe(200)
      const exported = (exp.body as { data: { oidcConfig: Array<Record<string, unknown>> } }).data.oidcConfig
      expect(exported).toHaveLength(1)
      expect(exported[0]!.provider_name).toBe('SaarAuth')
      const before = await oidcConfigRepository.get()

      const imp = await dispatch({ method: 'POST', path: '/api/backup/import', cookies, body: exp.body })
      expect(imp.status, JSON.stringify(imp.error)).toBe(200)
      const after = await oidcConfigRepository.get()
      expect(after.provider_name).toBe('SaarAuth')
      expect({ ...after, config_revision: 0, updated_at: '' }).toEqual({ ...before, config_revision: 0, updated_at: '' })
      expect(after.config_revision).toBeGreaterThan(before.config_revision)
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
      expect((await status()).body).toEqual({ enabled: true, provider_name: 'SaarAuth' })
    })

    it('restore still refuses payloads without a local admin (invariant unchanged) with a named config present', async () => {
      await expect(restoreAll(prisma, payload({ users: [adminRow({ role: 'viewer' })], oidcConfig: [cfgRow({ provider_name: 'X' })] }), { oidcKey: key() }))
        .rejects.toMatchObject({ statusCode: 400 })
    })
  })
})
