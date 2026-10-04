import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'

const TS = '2026-01-01T00:00:00Z'

describe('patch panel data survives backup export → import (real routes)', () => {
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
    setOidcRuntime({ publicBaseUrl: '' })
  })

  it('keeps panels, sockets (incl. tested/side/outlet/location) and tokens', async () => {
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    const siteId = randomUUID()
    const panelId = randomUUID()
    await prisma.site.create({ data: { id: siteId, slug: 'site-a', name: 'Site A', created_at: TS, updated_at: TS } })
    await prisma.patchPanel.create({
      data: { id: panelId, site_id: siteId, slug: 'panel-a', name: 'Panel A', description: 'Rack 1 front', port_count: 12, created_at: TS, updated_at: TS }
    })
    for (let n = 1; n <= 12; n++) {
      await prisma.patchPanelSocket.create({
        data: {
          id: randomUUID(), patch_panel_id: panelId, port_number: n,
          side: n % 2 ? 'L' : 'R', outlet_number: `O-${n}`, location: `loc-${n}`,
          tested: n % 3 === 0, created_at: TS, updated_at: TS
        }
      })
    }
    await prisma.patchPanelSocket.update({
      where: { patch_panel_id_port_number: { patch_panel_id: panelId, port_number: 12 } },
      data: { side: null, outlet_number: null, location: null }
    })
    const tokenRows = [
      { id: randomUUID(), patch_panel_id: panelId, token: randomUUID().replace(/-/g, ''), created_at: TS, revoked_at: null, last_access_at: TS },
      { id: randomUUID(), patch_panel_id: panelId, token: randomUUID().replace(/-/g, ''), created_at: TS, revoked_at: TS, last_access_at: null }
    ]
    await prisma.patchPanelToken.createMany({ data: tokenRows })

    const snapshot = async () => ({
      panels: (await prisma.patchPanel.findMany({ orderBy: { id: 'asc' } }))
        .map(p => ({ id: p.id, site: p.site_id, slug: p.slug, name: p.name, description: p.description, ports: p.port_count, created: p.created_at, updated: p.updated_at })),
      sockets: (await prisma.patchPanelSocket.findMany({ orderBy: { port_number: 'asc' } }))
        .map(s => ({ id: s.id, created: s.created_at, updated: s.updated_at, port: s.port_number, side: s.side, outlet: s.outlet_number, location: s.location, tested: s.tested })),
      tokens: (await prisma.patchPanelToken.findMany({ orderBy: { id: 'asc' } }))
        .map(t => ({ id: t.id, revoked: t.revoked_at, last: t.last_access_at, created: t.created_at }))
    })
    const before = await snapshot()

    const cookies = asCookie(tokenFor(admin))
    const exp = await dispatch({ path: '/api/backup/export', cookies })
    expect(exp.status).toBe(200)
    const exportedData = (exp.body as { data: Record<string, unknown> }).data
    expect([
      (exportedData.patchPanels as unknown[] | undefined)?.length,
      (exportedData.patchPanelSockets as unknown[] | undefined)?.length,
      (exportedData.patchPanelTokens as unknown[] | undefined)?.length
    ]).toEqual([1, 12, 2])
    const imp = await dispatch({ method: 'POST', path: '/api/backup/import', cookies, body: exp.body })
    expect(imp.status).toBe(200)

    const counts = {
      panels: await prisma.patchPanel.count(),
      sockets: await prisma.patchPanelSocket.count(),
      tokens: await prisma.patchPanelToken.count()
    }
    expect(counts).toEqual({ panels: 1, sockets: 12, tokens: 2 })
    expect(await snapshot()).toEqual(before)
    const tokensIntact = (await prisma.patchPanelToken.findMany()).map(t => t.token).sort()
    const expectedTokens = tokenRows.map(t => t.token).sort()
    expect(tokensIntact.length === expectedTokens.length
      && tokensIntact.every((token, index) => token === expectedTokens[index])).toBe(true)
  })
})
