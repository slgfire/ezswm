import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { siteRepository } from '../server/repositories/siteRepository'
import { userRepository } from '../server/repositories/userRepository'
import { buildOidcSessionClaims } from '../server/utils/oidc/session'

const KEY_B64 = randomBytes(32).toString('base64')
const ISSUER = 'https://idp.example.com'

describe('user preferred start site (Issue #298)', () => {
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
    resetOidcRuntime()
    setOidcRuntime({ oidcEncryptionKey: KEY_B64, publicBaseUrl: '' })
  })

  const edit = (cookies: Record<string, string>, id: string, body: unknown) =>
    dispatch({ method: 'PUT', path: `/api/users/${id}`, cookies, body })
  const storedPreference = async (id: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id } })).start_site_id

  it('admin sets, clears and omits the preference; each response is a safe DTO', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const target = await seedLocalUser(prisma, { username: 'target', role: 'viewer' })
    const site = await seedSite(prisma, { name: 'HQ' })
    const other = await seedSite(prisma, { name: 'Branch' })

    const set = await edit(asCookie(tokenFor(admin)), target.id, { start_site_id: site.id })
    expect(set.status).toBe(200)
    expect(set.body).toMatchObject({ id: target.id, start_site_id: site.id })
    expect('password_hash' in (set.body as object)).toBe(false)
    expect(await storedPreference(target.id)).toBe(site.id)

    // Omitted field preserves the stored preference.
    const omitted = await edit(asCookie(tokenFor(admin)), target.id, { display_name: 'Renamed' })
    expect(omitted.status).toBe(200)
    expect(await storedPreference(target.id)).toBe(site.id)

    // An explicit null clears it (Automatic).
    const cleared = await edit(asCookie(tokenFor(admin)), target.id, { start_site_id: null })
    expect(cleared.status).toBe(200)
    expect(cleared.body).toMatchObject({ start_site_id: null })
    expect(await storedPreference(target.id)).toBeNull()

    // A different site can be selected afterwards.
    expect((await edit(asCookie(tokenFor(admin)), target.id, { start_site_id: other.id })).status).toBe(200)
    expect(await storedPreference(target.id)).toBe(other.id)

    // Admin overview and self /me expose the same field.
    const list = await dispatch({ path: '/api/users', cookies: asCookie(tokenFor(admin)) })
    expect((list.body as Array<Record<string, unknown>>).find(u => u.id === target.id)?.start_site_id).toBe(other.id)
    const me = await dispatch({ path: '/api/auth/me', cookies: asCookie(tokenFor(target)) })
    expect((me.body as Record<string, unknown>).start_site_id).toBe(other.id)
  })

  it('rejects unknown and malformed site IDs with 400 and writes nothing', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const target = await seedLocalUser(prisma, { username: 'target', role: 'viewer' })
    const site = await seedSite(prisma, { name: 'HQ' })
    await prisma.user.update({ where: { id: target.id }, data: { start_site_id: site.id } })
    const before = await prisma.user.findUniqueOrThrow({ where: { id: target.id } })

    for (const bad of [randomUUID(), 'not-a-uuid', 42, true, { id: site.id }]) {
      const r = await edit(asCookie(tokenFor(admin)), target.id, { start_site_id: bad, display_name: 'Nope' })
      expect(r.status, JSON.stringify(bad)).toBe(400)
    }
    expect(await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before)
    expect(await storedPreference(target.id)).toBe(site.id)
  })

  it('viewer may change only their own preference; foreign users and protected fields are refused', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const viewer = await seedLocalUser(prisma, { username: 'viewer', role: 'viewer' })
    const other = await seedLocalUser(prisma, { username: 'other', role: 'viewer' })
    const site = await seedSite(prisma, { name: 'HQ' })
    const vc = asCookie(tokenFor(viewer))

    // Self-service set and clear.
    expect((await edit(vc, viewer.id, { start_site_id: site.id })).status).toBe(200)
    expect(await storedPreference(viewer.id)).toBe(site.id)
    expect((await edit(vc, viewer.id, { start_site_id: null })).status).toBe(200)
    expect(await storedPreference(viewer.id)).toBeNull()

    // Unknown site for self: 400, unchanged.
    expect((await edit(vc, viewer.id, { start_site_id: randomUUID() })).status).toBe(400)
    expect(await storedPreference(viewer.id)).toBeNull()

    // Foreign user is forbidden, even with a valid preference.
    expect((await edit(vc, other.id, { start_site_id: site.id })).status).toBe(403)
    expect(await storedPreference(other.id)).toBeNull()

    // Strict profile schema: role/username cannot be smuggled in.
    expect((await edit(vc, viewer.id, { role: 'admin' })).status).toBe(400)
    expect((await edit(vc, viewer.id, { username: 'renamed' })).status).toBe(400)
    expect((await edit(vc, viewer.id, { start_site_id: site.id, role: 'admin' })).status).toBe(400)
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id } })
    expect([stored.role, stored.username, stored.start_site_id]).toEqual(['viewer', 'viewer', null])

    // Admin role stays required for editing someone else.
    expect((await edit(asCookie(tokenFor(admin)), other.id, { start_site_id: site.id })).status).toBe(200)
  })

  it('OIDC users keep the preference through a safe self-service profile update', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const site = await seedSite(prisma, { name: 'HQ' })
    const cfg = await oidcConfigRepository.update({ enabled: true, issuer: ISSUER, client_id: 'cid', admin_groups: ['admins'] })
    const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: ISSUER, subject: 'sub-1', role: 'viewer', displayName: 'O' })
    const cookies = asCookie(tokenFor(user, buildOidcSessionClaims(user, cfg.config)))

    const r = await edit(cookies, user.id, { start_site_id: site.id, language: 'de' })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ start_site_id: site.id, language: 'de', auth_provider: 'oidc' })
    expect('password_hash' in (r.body as object)).toBe(false)
    expect(await storedPreference(user.id)).toBe(site.id)

    // Provider-managed fields remain locked for OIDC users.
    expect((await edit(asCookie(tokenFor(admin)), user.id, { role: 'admin' })).status).toBe(409)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('viewer')
  })

  it('deleting a site clears only the affected preferences', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const one = await seedLocalUser(prisma, { username: 'one', role: 'viewer' })
    const two = await seedLocalUser(prisma, { username: 'two', role: 'viewer' })
    const doomed = await seedSite(prisma, { name: 'Doomed' })
    const kept = await seedSite(prisma, { name: 'Kept' })
    await prisma.user.update({ where: { id: one.id }, data: { start_site_id: doomed.id } })
    await prisma.user.update({ where: { id: two.id }, data: { start_site_id: kept.id } })

    expect(await siteRepository.delete(doomed.id)).toBe(true)

    expect(await storedPreference(one.id)).toBeNull()
    expect(await storedPreference(two.id)).toBe(kept.id)
    expect(await storedPreference(admin.id)).toBeNull()
    expect((await prisma.user.findUniqueOrThrow({ where: { id: one.id } })).username).toBe('one')
  })
})
