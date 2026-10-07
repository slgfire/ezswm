import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { userRepository } from '../server/repositories/userRepository'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'

const KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'

describe('/api/users management contracts (create / update / delete)', () => {
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

  const adminCookies = (u: { id: string, username: string, role: string }) => asCookie(tokenFor(u))
  const create = (cookies: Record<string, string>, body: unknown) => dispatch({ method: 'POST', path: '/api/users', cookies, body })
  const edit = (cookies: Record<string, string>, id: string, body: unknown) => dispatch({ method: 'PUT', path: `/api/users/${id}`, cookies, body })
  const remove = (cookies: Record<string, string>, id: string) => dispatch({ method: 'DELETE', path: `/api/users/${id}`, cookies })

  async function oidcAdminSession(subject: string, role: 'admin' | 'viewer' = 'admin') {
    const cfg = await oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject, role, displayName: `OIDC ${subject}` })
    return { user, cookies: asCookie(tokenFor(user, buildOidcSessionClaims(user, cfg.config))) }
  }

  it('creates a LOCAL viewer (201), returns a safe DTO and stores a bcrypt hash', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const r = await create(adminCookies(admin), { username: 'new_viewer', display_name: 'New Viewer', password: 'password-123', role: 'viewer', language: 'de' })
    expect(r.error).toBeUndefined()
    const dto = r.body as Record<string, unknown>
    expect(dto).toMatchObject({ username: 'new_viewer', display_name: 'New Viewer', role: 'viewer', language: 'de', auth_provider: 'local' })
    expect('password_hash' in dto).toBe(false)
    expect(JSON.stringify(dto)).not.toContain('password-123')
    const stored = await prisma.user.findFirstOrThrow({ where: { username: 'new_viewer' } })
    expect(stored.auth_provider).toBe('local')
    expect(stored.oidc_subject).toBeNull()
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/)
    expect(stored.password_hash).not.toBe('password-123')
    expect(await bcrypt.compare('password-123', stored.password_hash!)).toBe(true)
  })

  it('rejects invalid username/password input and duplicate usernames (409) without writing rows', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const c = adminCookies(admin)
    const good = { username: 'valid_name', display_name: 'V', password: 'password-123', role: 'viewer', language: 'en' }
    for (const bad of [{ ...good, username: 'ab' }, { ...good, username: 'bad name!' }, { ...good, password: 'short' }, { ...good, role: 'owner' }, { ...good, language: 'fr' }]) {
      const r = await create(c, bad)
      expect(r.status).toBe(400)
      expect(r.error?.statusCode).toBe(400)
      // Generic message: no submitted password/body or Zod issue detail is echoed.
      expect(JSON.stringify(r.error)).not.toMatch(/password-123|short|bad name|invalid_|Zod/i)
    }
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.user.count({ where: { username: { in: ['ab', 'bad name!', 'valid_name'] } } })).toBe(0)
    expect((await create(c, good)).error).toBeUndefined()
    const dup = await create(c, good)
    expect(dup.status).toBe(409)
    expect(await prisma.user.count()).toBe(2)
  })

  it('edits a local user display name/role/language and never leaks the hash', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const target = await seedLocalUser(prisma, { username: 'target', role: 'viewer' })
    const r = await edit(adminCookies(admin), target.id, { display_name: 'Renamed', role: 'admin', language: 'de' })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ id: target.id, display_name: 'Renamed', role: 'admin', language: 'de' })
    expect('password_hash' in (r.body as object)).toBe(false)
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
    expect([stored.display_name, stored.role, stored.language]).toEqual(['Renamed', 'admin', 'de'])
    // Display name / language remain editable without touching the role.
    expect((await edit(adminCookies(admin), target.id, { display_name: 'Again' })).status).toBe(200)
  })

  it('locks the role of OIDC users (409) while the stored role stays unchanged', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    await oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'lock-1', role: 'viewer', displayName: 'L' })
    const r = await edit(adminCookies(admin), user.id, { role: 'admin' })
    expect(r.status).toBe(409)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('viewer')
  })

  it('refuses self-delete (400) and keeps the row', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    await seedLocalUser(prisma, { username: 'second', role: 'admin' })
    const r = await remove(adminCookies(admin), admin.id)
    expect(r.status).toBe(400)
    expect(await prisma.user.count({ where: { id: admin.id } })).toBe(1)
  })

  it('an OIDC admin does not count as a local emergency admin: deleting AND demoting the last local admin is 409', async () => {
    const onlyLocal = await seedLocalUser(prisma, { username: 'only_local', role: 'admin' })
    const { cookies } = await oidcAdminSession('emerg-1')
    const del = await remove(cookies, onlyLocal.id)
    expect(del.status).toBe(409)
    const demote = await edit(cookies, onlyLocal.id, { role: 'viewer' })
    expect(demote.status).toBe(409)
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: onlyLocal.id } })
    expect(stored.role).toBe('admin')
    // With a second LOCAL admin present both operations succeed.
    await seedLocalUser(prisma, { username: 'other_local', role: 'admin' })
    expect((await edit(cookies, onlyLocal.id, { role: 'viewer' })).status).toBe(200)
  })

  it('successful delete returns 204-style empty result and nulls (preserves) the activity attribution', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const target = await seedLocalUser(prisma, { username: 'victim', role: 'viewer' })
    await prisma.activityEntry.create({
      data: {
        id: 'act-1', user_id: target.id, action: 'create', entity_type: 'site', entity_id: 's1',
        entity_name: 'Site 1', timestamp: new Date().toISOString()
      }
    })
    const r = await remove(adminCookies(admin), target.id)
    expect(r.error).toBeUndefined()
    expect(r.body ?? null).toBeNull()
    expect(await prisma.user.count({ where: { id: target.id } })).toBe(0)
    const entry = await prisma.activityEntry.findUniqueOrThrow({ where: { id: 'act-1' } })
    expect(entry.user_id).toBeNull()
    expect(entry.entity_name).toBe('Site 1')
  })

  it('deleting an OIDC user then re-provisioning the same issuer+subject yields a NEW id', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    await oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
    const { user: first } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'again', role: 'viewer', displayName: 'A' })
    expect((await remove(adminCookies(admin), first.id)).error).toBeUndefined()
    expect(await prisma.user.count({ where: { id: first.id } })).toBe(0)
    const { user: second, created } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'again', role: 'viewer', displayName: 'A' })
    expect(created).toBe(true)
    expect(second.id).not.toBe(first.id)
    expect(await prisma.user.count({ where: { oidc_issuer: ISSUER, oidc_subject: 'again' } })).toBe(1)
  })

  it('viewers cannot POST/DELETE (403) and a stale admin JWT after DB demotion is denied; zero changes', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const viewer = await seedLocalUser(prisma, { username: 'viewer1', role: 'viewer' })
    const victim = await seedLocalUser(prisma, { username: 'victim', role: 'viewer' })
    const body = { username: 'sneaky', display_name: 'S', password: 'password-123', role: 'admin', language: 'en' }
    const before = await prisma.user.findMany({ orderBy: { id: 'asc' } })

    const vc = adminCookies(viewer)
    expect((await create(vc, body)).status).toBe(403)
    expect((await remove(vc, victim.id)).status).toBe(403)
    // Forged admin claim on a viewer account: DB role is authoritative.
    const forged = asCookie(tokenFor({ id: viewer.id, username: viewer.username, role: 'admin' }))
    expect((await create(forged, body)).status).toBe(403)

    // Token minted while admin, then demoted in the DB.
    const stale = adminCookies(admin)
    await prisma.user.update({ where: { id: admin.id }, data: { role: 'viewer' } })
    const afterDemotion = await prisma.user.findMany({ orderBy: { id: 'asc' } })
    expect((await create(stale, body)).status).toBe(403)
    expect((await remove(stale, victim.id)).status).toBe(403)

    expect(await prisma.user.findMany({ orderBy: { id: 'asc' } })).toEqual(afterDemotion)
    expect(afterDemotion.length).toBe(before.length)
  })
})
