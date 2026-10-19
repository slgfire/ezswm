import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedNetwork } from './testHelpers'
import { asCookie, dispatch, installH3Globals, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { customDeviceTypeRepository, assertDeviceTypeAssignable } from '../server/repositories/customDeviceTypeRepository'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import { restoreAll } from '../server/utils/dataRestore'
import { IMPORTERS } from '../server/utils/entityImport'

describe('custom device types (Issue #301)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let admin: Record<string, string>
  let viewer: Record<string, string>
  let siteId: string
  let networkId: string

  beforeAll(async () => {
    installH3Globals()
    setOidcRuntime()
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
    admin = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
    viewer = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'view', role: 'viewer' })))
    siteId = (await seedSite(prisma, { slug: 'dt' })).id
    networkId = (await seedNetwork(prisma, { site_id: siteId, name: 'DT Net', subnet: '10.9.0.0/24' })).id
  })

  // ── API: admin CRUD, viewer 403 ──────────────────────────────────────────

  it('admin creates a trimmed custom type; viewers can read the list', async () => {
    const created = await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: '  Game console  ' } })
    expect(created.status).toBe(200)
    const body = created.body as { id: string, name: string, active: boolean }
    expect(body.name).toBe('Game console')
    expect(body.active).toBe(true)

    const list = await dispatch({ method: 'GET', path: '/api/device-types', cookies: viewer })
    expect(list.status).toBe(200)
    expect(list.body).toEqual([{ id: body.id, name: 'Game console', active: true }])
  })

  it('rejects viewer writes with 403', async () => {
    const post = await dispatch({ method: 'POST', path: '/api/device-types', cookies: viewer, body: { name: 'Nope' } })
    expect(post.status).toBe(403)
    const id = (await customDeviceTypeRepository.create('Existing')).id
    const put = await dispatch({ method: 'PUT', path: `/api/device-types/${id}`, cookies: viewer, body: { active: false } })
    expect(put.status).toBe(403)
  })

  it('rejects duplicate names case-insensitively and reserved builtin names', async () => {
    await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: 'Kiosk' } })
    const dup = await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: 'kiosk' } })
    expect(dup.status).toBe(409)
    const builtin = await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: 'Switch' } })
    expect(builtin.status).toBe(409)
    const blank = await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: '   ' } })
    expect(blank.status).toBe(400)
  })

  it('admin renames, deactivates and reactivates; rename collisions are 409', async () => {
    const a = (await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: 'Alpha' } })).body as { id: string }
    await dispatch({ method: 'POST', path: '/api/device-types', cookies: admin, body: { name: 'Beta' } })

    const renamed = await dispatch({ method: 'PUT', path: `/api/device-types/${a.id}`, cookies: admin, body: { name: 'Alpha 2' } })
    expect((renamed.body as { name: string }).name).toBe('Alpha 2')
    const clash = await dispatch({ method: 'PUT', path: `/api/device-types/${a.id}`, cookies: admin, body: { name: 'beta' } })
    expect(clash.status).toBe(409)
    const same = await dispatch({ method: 'PUT', path: `/api/device-types/${a.id}`, cookies: admin, body: { name: 'alpha 2' } })
    expect(same.status).toBe(200)

    const off = await dispatch({ method: 'PUT', path: `/api/device-types/${a.id}`, cookies: admin, body: { active: false } })
    expect((off.body as { active: boolean }).active).toBe(false)
    const list = await dispatch({ method: 'GET', path: '/api/device-types', cookies: viewer })
    expect((list.body as Array<{ id: string, active: boolean }>).find(t => t.id === a.id)?.active).toBe(false)
    const on = await dispatch({ method: 'PUT', path: `/api/device-types/${a.id}`, cookies: admin, body: { active: true } })
    expect((on.body as { active: boolean }).active).toBe(true)
  })

  // ── Allocation assignment rules ──────────────────────────────────────────

  it('allows builtin and active custom ids; rejects unknown and inactive new assignments', async () => {
    const custom = await customDeviceTypeRepository.create('Console')
    const inactive = await customDeviceTypeRepository.create('Retired')
    await customDeviceTypeRepository.update(inactive.id, { active: false })

    await expect(ipAllocationRepository.create(networkId, { ip_address: '10.9.0.10', status: 'active', device_type: 'switch' })).resolves.toBeTruthy()
    await expect(ipAllocationRepository.create(networkId, { ip_address: '10.9.0.11', status: 'active', device_type: custom.id })).resolves.toBeTruthy()
    await expect(ipAllocationRepository.create(networkId, { ip_address: '10.9.0.12', status: 'active', device_type: 'workstation' }))
      .rejects.toMatchObject({ statusCode: 400 })
    await expect(ipAllocationRepository.create(networkId, { ip_address: '10.9.0.13', status: 'active', device_type: inactive.id }))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/inactive/) })
    await expect(assertDeviceTypeAssignable('not-a-builtin')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('keeps an unchanged inactive or legacy value on update, allows clearing, blocks new unknown values', async () => {
    const inactive = await customDeviceTypeRepository.create('Retired')
    await customDeviceTypeRepository.update(inactive.id, { active: false })

    const now = new Date().toISOString()
    const inactiveAlloc = await prisma.ipAllocation.create({
      data: { id: randomUUID(), network_id: networkId, ip_address: '10.9.0.20', device_type: inactive.id, status: 'active', created_at: now, updated_at: now }
    })
    const legacyAlloc = await prisma.ipAllocation.create({
      data: { id: randomUUID(), network_id: networkId, ip_address: '10.9.0.21', device_type: 'workstation', status: 'active', created_at: now, updated_at: now }
    })

    const same = await ipAllocationRepository.update(inactiveAlloc.id, { device_type: inactive.id })
    expect(same.device_type).toBe(inactive.id)
    const legacySame = await ipAllocationRepository.update(legacyAlloc.id, { device_type: 'workstation' })
    expect(legacySame.device_type).toBe('workstation')

    await expect(ipAllocationRepository.update(legacyAlloc.id, { device_type: 'toaster' })).rejects.toMatchObject({ statusCode: 400 })
    expect((await ipAllocationRepository.update(legacyAlloc.id, { device_type: null })).device_type).toBeNull()
  })

  it('imports preserve raw legacy keys instead of dropping them', async () => {
    const result = await IMPORTERS.allocations([{ network_id: networkId, ip_address: '10.9.0.30', device_type: 'workstation', status: 'active' }])
    expect(result.imported).toBe(1)
    const stored = await prisma.ipAllocation.findFirst({ where: { ip_address: '10.9.0.30' } })
    expect(stored?.device_type).toBe('workstation')
  })

  // ── Backup / restore / export ────────────────────────────────────────────

  const basePayload = (extra: Record<string, unknown[]> = {}) => ({
    schema: 'sqlite-v1',
    data: {
      users: [{
        id: randomUUID(), username: 'admin', display_name: 'Admin', password_hash: 'x',
        role: 'admin', language: 'en', is_setup_user: true,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
      }],
      settings: [{
        id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null,
        default_port_status: 'down', port_speeds: JSON.stringify(['1G']),
        setup_completed: true, sites_initialized: true
      }],
      sites: [{
        id: randomUUID(), slug: 'restored', name: 'Restored', description: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
      }],
      ...extra
    }
  })

  it('round-trips custom types through restore and both exports', async () => {
    const customId = randomUUID()
    const payload = basePayload({
      customDeviceTypes: [{ id: customId, name: 'Round trip', active: true }]
    })
    const result = await restoreAll(prisma, payload)
    expect(result.inserted.customDeviceTypes).toBe(1)
    // The restore replaces users; the pre-restore session no longer exists.
    admin = asCookie(tokenFor(await prisma.user.findFirstOrThrow()))

    const backup = await dispatch({ method: 'GET', path: '/api/backup/export', cookies: admin })
    expect((backup.body as { data: { customDeviceTypes: unknown[] } }).data.customDeviceTypes)
      .toEqual([{ id: customId, name: 'Round trip', active: true }])

    const inventory = await dispatch({ method: 'GET', path: '/api/data/export', cookies: admin })
    expect((inventory.body as { data: { customDeviceTypes: unknown[] } }).data.customDeviceTypes)
      .toEqual([{ id: customId, name: 'Round trip', active: true }])
  })

  it('restores a backup without the custom array as an empty list', async () => {
    await prisma.customDeviceType.create({ data: { id: randomUUID(), name: 'Will be wiped', active: true } })
    await restoreAll(prisma, basePayload())
    expect(await prisma.customDeviceType.count()).toBe(0)
  })

  it('rejects malformed custom rows without partial writes', async () => {
    const before = await prisma.site.count()
    await expect(restoreAll(prisma, basePayload({
      customDeviceTypes: [{ id: randomUUID(), name: '   ', active: true }]
    }))).rejects.toMatchObject({ statusCode: 400 })
    expect(await prisma.site.count()).toBe(before)
    expect(await prisma.customDeviceType.count()).toBe(0)
  })
})
