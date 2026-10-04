import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { userRepository } from '../server/repositories/userRepository'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'

const KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'
const FAKE_HASH = '$2a$10$abcdefghijklmnopqrstuuWJ3xv0q9Z0g5l2H0zPq3n3e0dF5v1a2'

/** Every field the read-only overview list may carry; password_hash must never be among them. */
const SAFE_KEYS = [
  'id', 'username', 'display_name', 'role', 'language', 'is_setup_user', 'created_at', 'updated_at',
  'auth_provider', 'oidc_issuer', 'oidc_subject', 'oidc_session_version'
].sort()

interface Row { id: string, username: string, display_name: string, role: string, auth_provider: string }

describe('GET /api/users (read-only admin users overview contract)', () => {
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

  async function enableOidc() {
    return oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
  }
  const list = (cookies: Record<string, string>) => dispatch({ path: '/api/users', cookies })

  async function snapshot() {
    return {
      users: await prisma.user.findMany({ orderBy: { id: 'asc' } }),
      config: await prisma.oidcConfig.findMany(),
      txns: await prisma.oidcLoginTxn.count()
    }
  }

  it('returns local and OIDC rows with the four display values and never a password_hash property', async () => {
    const local = await seedLocalUser(prisma, { username: 'alice_local', role: 'admin', passwordHash: FAKE_HASH })
    await prisma.user.update({ where: { id: local.id }, data: { display_name: 'Alice <b>Local</b>' } })
    await seedLocalUser(prisma, { username: 'bob_viewer', role: 'viewer', passwordHash: FAKE_HASH })
    const cfg = await enableOidc()
    const { user: oidcAdmin } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'sub-admin', role: 'admin', displayName: 'Olivia OIDC' })
    await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'sub-viewer', role: 'viewer', displayName: 'Victor OIDC' })

    const r = await list(asCookie(tokenFor(local)))
    expect(r.status).toBe(200)
    const rows = r.body as Array<Row & Record<string, unknown>>
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(Object.prototype.hasOwnProperty.call(row, 'password_hash'), `password_hash on ${row.username}`).toBe(false)
      expect(Object.keys(row).sort()).toEqual(SAFE_KEYS)
    }
    expect(JSON.stringify(r.body)).not.toContain(FAKE_HASH)
    expect(JSON.stringify(r.body)).not.toContain('password_hash')

    const by = (name: string) => rows.find(x => x.username === name)!
    expect(by('alice_local')).toMatchObject({ display_name: 'Alice <b>Local</b>', role: 'admin', auth_provider: 'local', oidc_issuer: null, oidc_subject: null })
    expect(by('bob_viewer')).toMatchObject({ role: 'viewer', auth_provider: 'local' })
    const oidcRows = rows.filter(x => x.auth_provider === 'oidc')
    expect(oidcRows.map(x => [x.display_name, x.role]).sort()).toEqual([['Olivia OIDC', 'admin'], ['Victor OIDC', 'viewer']])
    // The OIDC identity fields are present in the API payload (the page must not render them).
    expect(oidcRows.every(x => x.oidc_issuer === ISSUER && typeof x.oidc_subject === 'string')).toBe(true)

    // An OIDC admin (valid signed JWT with current revision) can read the same list.
    const oidcToken = tokenFor(oidcAdmin, buildOidcSessionClaims(oidcAdmin, cfg.config))
    const asOidc = await list(asCookie(oidcToken))
    expect(asOidc.status).toBe(200)
    expect((asOidc.body as Row[]).map(x => x.username).sort()).toEqual(rows.map(x => x.username).sort())
  })

  it('an OIDC row with a NULL password hash still has no password_hash key (null must be stripped too)', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    await enableOidc()
    await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 's1', role: 'viewer', displayName: 'N' })
    const stored = await prisma.user.findFirstOrThrow({ where: { auth_provider: 'oidc' } })
    expect(stored.password_hash).toBeNull()
    const rows = (await list(asCookie(tokenFor(admin)))).body as Array<Record<string, unknown>>
    const o = rows.find(x => x.auth_provider === 'oidc')!
    expect('password_hash' in o).toBe(false)
  })

  it('denies anonymous (401) and viewers (403); malformed / forged tokens never read', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const viewer = await seedLocalUser(prisma, { username: 'view', role: 'viewer' })
    expect((await list({})).status).toBe(401)
    expect((await list(asCookie('not-a-jwt'))).status).toBe(401)
    expect((await list(asCookie(tokenFor(viewer)))).status).toBe(403)
    expect((await list(asCookie(tokenFor(admin)))).status).toBe(200)
    const anon = await list({})
    expect(JSON.stringify(anon.body ?? anon.error)).not.toContain('root')
  })

  it('the DATABASE role decides: stale/forged admin claim on a viewer is denied, low claim on an admin is allowed', async () => {
    const viewer = await seedLocalUser(prisma, { username: 'real_viewer', role: 'viewer' })
    const admin = await seedLocalUser(prisma, { username: 'real_admin', role: 'admin' })
    const forged = asCookie(tokenFor({ id: viewer.id, username: viewer.username, role: 'admin' }))
    const r = await list(forged)
    expect(r.status).toBe(403)
    expect(JSON.stringify(r.body ?? r.error)).not.toContain('real_admin')
    expect((await list(asCookie(tokenFor({ id: admin.id, username: admin.username, role: 'viewer' })))).status).toBe(200)
  })

  it('a viewer-role OIDC user is denied even with a perfectly valid session', async () => {
    await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const cfg = await enableOidc()
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'v1', role: 'viewer', displayName: 'V' })
    const cookies = asCookie(tokenFor(user, buildOidcSessionClaims(user, cfg.config)))
    expect((await dispatch({ path: '/api/sites', cookies })).status).toBe(200)
    expect((await list(cookies)).status).toBe(403)
  })

  it('an OIDC admin session is rejected when SSO is disabled or the config revision moved (no list read)', async () => {
    const { config } = await enableOidc()
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'a1', role: 'admin', displayName: 'A' })
    const cookies = asCookie(tokenFor(user, buildOidcSessionClaims(user, config)))
    expect((await list(cookies)).status).toBe(200)
    await oidcConfigRepository.update({ admin_groups: ['admins', 'ops'] })
    expect((await list(cookies)).status).toBe(401)
  })

  it('is a pure read: repeated GETs change no users, config, transactions or session versions', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const cfg = await enableOidc()
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'p1', role: 'admin', displayName: 'P' })
    const before = await snapshot()
    const oidcCookies = asCookie(tokenFor(user, buildOidcSessionClaims(user, cfg.config)))
    for (const c of [asCookie(tokenFor(admin)), oidcCookies, asCookie(tokenFor(admin))]) expect((await list(c)).status).toBe(200)
    expect(await snapshot()).toEqual(before)
  })

  it('an empty-ish installation (single admin) returns exactly that one row', async () => {
    const admin = await seedLocalUser(prisma, { username: 'only_admin', role: 'admin' })
    const rows = (await list(asCookie(tokenFor(admin)))).body as Row[]
    expect(rows.map(x => x.username)).toEqual(['only_admin'])
  })

  it('mutating verbs on the collection stay admin-only (no new anonymous/viewer write path)', async () => {
    const viewer = await seedLocalUser(prisma, { username: 'view', role: 'viewer' })
    const body = { username: 'x_user', display_name: 'X', password: 'password-123', role: 'viewer', language: 'en' }
    expect((await dispatch({ method: 'POST', path: '/api/users', cookies: asCookie(tokenFor(viewer)), body })).status).toBe(403)
    expect((await dispatch({ method: 'POST', path: '/api/users', cookies: {}, body })).status).toBe(401)
    expect(await prisma.user.count()).toBe(1)
  })
})
