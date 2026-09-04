import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { patchPanelRepository } from '../server/repositories/patchPanelRepository'
import { settingsRepository } from '../server/repositories/settingsRepository'
import listPatchPanels from '../server/api/patch-panels/index.get'
import createPatchPanel from '../server/api/patch-panels/index.post'
import updatePatchPanel from '../server/api/patch-panels/[id].put'
import updatePatchPanelSocket from '../server/api/patch-panels/[id]/sockets/[socketId].put'
import searchHandler from '../server/api/search.get'

describe('patch panel phase 1 foundation', () => {
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

  it('creates exactly two sockets per port with L/R defaults', async () => {
    const site = await seedSite(prisma)
    const panel = await patchPanelRepository.create({
      site_id: site.id,
      name: 'Panel A',
      port_count: 24
    })

    expect(panel.sockets).toHaveLength(48)
    for (let port = 1; port <= 24; port++) {
      const sides = panel.sockets.filter(s => s.port_number === port).map(s => s.side).sort()
      expect(sides).toEqual(['L', 'R'])
    }
    expect(panel.sockets.every(s => s.tested === false && s.outlet_number === undefined && s.location === undefined)).toBe(true)
  })

  it('rolls back panel create if socket creation fails in transaction', async () => {
    const site = await seedSite(prisma)
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_patch_panel_socket_insert BEFORE INSERT ON PatchPanelSocket BEGIN SELECT RAISE(ABORT, "forced"); END;')

    try {
      await expect(patchPanelRepository.create({
        site_id: site.id,
        name: 'Panel TX',
        port_count: 12
      })).rejects.toBeTruthy()
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_patch_panel_socket_insert;')
    }

    expect(await prisma.patchPanel.count()).toBe(0)
    expect(await prisma.patchPanelSocket.count()).toBe(0)
  })

  it('resolves slug collisions per-site and disambiguates by site context', async () => {
    const siteA = await seedSite(prisma, { name: 'A', slug: 'a' })
    const siteB = await seedSite(prisma, { name: 'B', slug: 'b' })

    const a1 = await patchPanelRepository.create({ site_id: siteA.id, name: 'Main Panel', port_count: 12 })
    const a2 = await patchPanelRepository.create({ site_id: siteA.id, name: 'Main Panel', port_count: 12 })
    const b1 = await patchPanelRepository.create({ site_id: siteB.id, name: 'Main Panel', port_count: 12 })

    expect(a1.slug).toBe('main-panel')
    expect(a2.slug).toBe('main-panel-2')
    expect(b1.slug).toBe('main-panel')

    expect(await patchPanelRepository.getByIdOrSlug('main-panel')).toBeNull()
    expect((await patchPanelRepository.getByIdOrSlug('main-panel', siteA.id))?.id).toBe(a1.id)
    expect((await patchPanelRepository.getByIdOrSlug('main-panel', siteB.id))?.id).toBe(b1.id)
  })

  it('filters list by site scope via site_id query (uuid or slug)', async () => {
    const siteA = await seedSite(prisma, { name: 'HQ', slug: 'hq' })
    const siteB = await seedSite(prisma, { name: 'Branch', slug: 'branch' })

    await settingsRepository.update({ patch_panels_enabled: true })
    await patchPanelRepository.create({ site_id: siteA.id, name: 'Panel A', port_count: 12 })
    await patchPanelRepository.create({ site_id: siteB.id, name: 'Panel B', port_count: 12 })

    const bySlug = await listPatchPanels({ query: { site_id: 'hq' } } as never) as { data: Array<{ site_id: string }> }
    const byUuid = await listPatchPanels({ query: { site_id: siteA.id } } as never) as { data: Array<{ site_id: string }> }

    expect(bySlug.data).toHaveLength(1)
    expect(bySlug.data[0]?.site_id).toBe(siteA.id)
    expect(byUuid.data).toHaveLength(1)
    expect(byUuid.data[0]?.site_id).toBe(siteA.id)
  })

  it('returns 404 for patch panel routes while disabled', async () => {
    await expect(listPatchPanels({ query: {} } as never)).rejects.toMatchObject({ statusCode: 404 })

    const site = await seedSite(prisma)
    await createRouteUser(prisma)
    await expect(createPatchPanel({
      context: { auth: { userId: 'route-user' } },
      body: { site_id: site.id, name: 'Disabled', port_count: 12 }
    } as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('updates socket fields only within panel/site context', async () => {
    const site = await seedSite(prisma, { slug: 'hq' })
    await settingsRepository.update({ patch_panels_enabled: true })
    await createRouteUser(prisma)

    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Panel Socket', port_count: 12 })
    const socket = panel.sockets[0]!

    const updated = await updatePatchPanelSocket({
      context: { params: { id: panel.slug, socketId: socket.id }, auth: { userId: 'route-user' } },
      query: { siteId: 'hq' },
      body: { outlet_number: 'A-01', location: 'Rack 7', tested: true }
    } as never) as { outlet_number?: string; location?: string; tested: boolean }

    expect(updated).toMatchObject({ outlet_number: 'A-01', location: 'Rack 7', tested: true })

    await expect(updatePatchPanelSocket({
      context: { params: { id: panel.slug, socketId: socket.id }, auth: { userId: 'route-user' } },
      query: { siteId: 'other-site' },
      body: { tested: false }
    } as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects port_count update attempts', async () => {
    const site = await seedSite(prisma)
    await settingsRepository.update({ patch_panels_enabled: true })
    await createRouteUser(prisma)
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Immutable', port_count: 24 })

    await expect(updatePatchPanel({
      context: { params: { id: panel.id }, auth: { userId: 'route-user' } },
      query: {},
      body: { port_count: 48 }
    } as never)).rejects.toMatchObject({ name: 'ZodError' })
  })

  it('search returns empty patchPanels while feature flag is disabled', async () => {
    const site = await seedSite(prisma, { slug: 'hq' })
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Patch Alpha', port_count: 12 })
    const socket = panel.sockets[0]!
    await patchPanelRepository.updateSocket(panel.id, socket.id, { outlet_number: 'O-42', location: 'Rack-Q' })

    const result = await searchHandler({ query: { q: 'rack' } } as never) as { patchPanels: unknown[] }
    expect(result.patchPanels).toEqual([])
  })

  it('search returns patch panel matches by name/socket and respects site filter', async () => {
    const siteA = await seedSite(prisma, { name: 'HQ', slug: 'hq' })
    const siteB = await seedSite(prisma, { name: 'Branch', slug: 'branch' })
    await settingsRepository.update({ patch_panels_enabled: true })

    const panelA = await patchPanelRepository.create({ site_id: siteA.id, name: 'Core PP', port_count: 12 })
    const panelASocket = panelA.sockets[2]!
    await patchPanelRepository.updateSocket(panelA.id, panelASocket.id, { outlet_number: 'A-102', location: 'Row 9' })

    const panelB = await patchPanelRepository.create({ site_id: siteB.id, name: 'Edge PP', port_count: 12 })
    const panelBSocket = panelB.sockets[4]!
    await patchPanelRepository.updateSocket(panelB.id, panelBSocket.id, { outlet_number: 'B-404', location: 'Remote Cage' })

    const bySocket = await searchHandler({ query: { q: 'row 9' } } as never) as { patchPanels: Array<Record<string, unknown>> }
    expect(bySocket.patchPanels).toHaveLength(1)
    expect(bySocket.patchPanels[0]).toMatchObject({
      id: panelA.id,
      slug: panelA.slug,
      name: panelA.name,
      site_id: siteA.id,
      outlet_number: 'A-102',
      location: 'Row 9',
      port_number: panelASocket.port_number,
      side: panelASocket.side
    })

    const byNameScoped = await searchHandler({ query: { q: 'pp', site_id: 'branch' } } as never) as { patchPanels: Array<Record<string, unknown>> }
    expect(byNameScoped.patchPanels).toHaveLength(1)
    expect(byNameScoped.patchPanels[0]).toMatchObject({ id: panelB.id, site_id: siteB.id, name: panelB.name })
  })
})

async function createRouteUser(prisma: PrismaClient): Promise<void> {
  const now = new Date().toISOString()
  await prisma.user.create({
    data: {
      id: 'route-user',
      username: 'route-user',
      display_name: 'Route User',
      password_hash: 'unused',
      role: 'admin',
      language: 'en',
      is_setup_user: false,
      created_at: now,
      updated_at: now
    }
  })
}
