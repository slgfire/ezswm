import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'

const TS = '2026-01-01T00:00:00Z'
const PP_KEYS = ['patchPanels', 'patchPanelSockets', 'patchPanelTokens'] as const

type Data = Record<string, unknown[] | undefined>

describe('patch panel backup restore safety (real isolated SQLite)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let cookies: Record<string, string>
  let ids: { site: string, panel: string, socket: string, token: string }

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
    setOidcRuntime({ publicBaseUrl: '' })

    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    cookies = asCookie(tokenFor(admin))
    ids = { site: randomUUID(), panel: randomUUID(), socket: randomUUID(), token: randomUUID() }
    await prisma.appSettings.create({
      data: { id: 'singleton', app_name: 'ezSWM', port_speeds: JSON.stringify(['1G']), default_port_status: 'down', setup_completed: true, sites_initialized: true }
    })
    await prisma.site.create({ data: { id: ids.site, slug: 'site-a', name: 'Site A', created_at: TS, updated_at: TS } })
    await prisma.patchPanel.create({
      data: { id: ids.panel, site_id: ids.site, slug: 'panel-a', name: 'Panel A', port_count: 4, created_at: TS, updated_at: TS }
    })
    await prisma.patchPanelSocket.create({
      data: { id: ids.socket, patch_panel_id: ids.panel, port_number: 1, tested: true, created_at: TS, updated_at: TS }
    })
    await prisma.patchPanelToken.create({
      data: { id: ids.token, patch_panel_id: ids.panel, token: randomUUID().replace(/-/g, ''), created_at: TS }
    })
    await prisma.oidcConfig.create({
      data: {
        id: 'singleton', enabled: true, issuer: 'https://idp.example.com', client_id: 'cid',
        client_secret_ciphertext: randomBytes(24).toString('base64'), config_revision: 7, updated_at: TS
      }
    })
    await prisma.oidcLoginTxn.create({
      data: {
        id: randomUUID(), state_hash: randomUUID(), nonce: 'n', code_verifier: 'v', binding_hash: 'b',
        config_revision: 7, created_at: TS, expires_at: new Date(Date.now() + 600000).toISOString()
      }
    })
  })

  // Whole-DB state as one opaque in-memory string; only ever compared as a boolean.
  async function stateOf(): Promise<string> {
    const tables = [
      prisma.user.findMany({ orderBy: { id: 'asc' } }),
      prisma.appSettings.findMany({ orderBy: { id: 'asc' } }),
      prisma.site.findMany({ orderBy: { id: 'asc' } }),
      prisma.patchPanel.findMany({ orderBy: { id: 'asc' } }),
      prisma.patchPanelSocket.findMany({ orderBy: { id: 'asc' } }),
      prisma.patchPanelToken.findMany({ orderBy: { id: 'asc' } }),
      prisma.switch.findMany({ orderBy: { id: 'asc' } }),
      prisma.switchGroup.findMany({ orderBy: { id: 'asc' } }),
      prisma.port.findMany({ orderBy: { id: 'asc' } }),
      prisma.vlan.findMany({ orderBy: { id: 'asc' } }),
      prisma.network.findMany({ orderBy: { id: 'asc' } }),
      prisma.ipAllocation.findMany({ orderBy: { id: 'asc' } }),
      prisma.ipRange.findMany({ orderBy: { id: 'asc' } }),
      prisma.layoutTemplate.findMany({ orderBy: { id: 'asc' } }),
      prisma.lagGroup.findMany({ orderBy: { id: 'asc' } }),
      prisma.activityEntry.findMany({ orderBy: { id: 'asc' } }),
      prisma.publicToken.findMany({ orderBy: { id: 'asc' } }),
      prisma.topologyLayout.findMany({ orderBy: { site_id: 'asc' } }),
      prisma.oidcConfig.findMany({ orderBy: { id: 'asc' } }),
      prisma.oidcLoginTxn.findMany({ orderBy: { id: 'asc' } })
    ]
    return JSON.stringify(await Promise.all(tables))
  }

  async function exportData(): Promise<Data> {
    const exp = await dispatch({ path: '/api/backup/export', cookies })
    expect(exp.status).toBe(200)
    return JSON.parse(JSON.stringify((exp.body as { data: Data }).data)) as Data
  }

  const doImport = (data: Data) =>
    dispatch({ method: 'POST', path: '/api/backup/import', cookies, body: { schema: 'sqlite-v1', data } })

  /** Import must fail and leave the whole DB (incl. OIDC revision/txns) untouched. */
  async function expectRejectedUnchanged(data: Data, status?: number) {
    const before = await stateOf()
    const res = await doImport(data)
    expect(res.status).toBeGreaterThanOrEqual(400)
    if (status) expect(res.status).toBe(status)
    expect((await stateOf()) === before).toBe(true)
    expect(await prisma.oidcLoginTxn.count()).toBe(1)
    expect((await prisma.oidcConfig.findUnique({ where: { id: 'singleton' } }))?.config_revision).toBe(7)
  }

  it('legacy backup without patch panel keys is rejected (400) and nothing is purged', async () => {
    const data = await exportData()
    for (const k of PP_KEYS) delete data[k]
    await expectRejectedUnchanged(data, 400)
    expect(await prisma.patchPanel.count()).toBe(1)
  })

  describe('partial / malformed patch panel groups are rejected before any write', () => {
    for (const missing of PP_KEYS) {
      it(`missing ${missing}`, async () => {
        const data = await exportData()
        delete data[missing]
        await expectRejectedUnchanged(data, 400)
      })
      it(`null ${missing}`, async () => {
        const data = await exportData()
        data[missing] = null as unknown as unknown[]
        await expectRejectedUnchanged(data, 400)
      })
      it(`non-array ${missing}`, async () => {
        const data = await exportData()
        data[missing] = {} as unknown as unknown[]
        await expectRejectedUnchanged(data, 400)
      })
    }
  })

  it('all three explicit empty arrays are an intentional empty snapshot (existing panels deleted)', async () => {
    const data = await exportData()
    for (const k of PP_KEYS) data[k] = []
    const res = await doImport(data)
    expect(res.status).toBe(200)
    expect(await prisma.patchPanel.count()).toBe(0)
    expect(await prisma.patchPanelSocket.count()).toBe(0)
    expect(await prisma.patchPanelToken.count()).toBe(0)
    expect(await prisma.oidcLoginTxn.count()).toBe(0)
    expect(await prisma.user.count()).toBe(1)
  })

  describe('invalid rows fail atomically', () => {
    it('non-UUID id in a new table → 400', async () => {
      for (const key of PP_KEYS) {
        const data = await exportData()
        ;(data[key]![0] as Record<string, unknown>).id = 'not-a-uuid'
        await expectRejectedUnchanged(data, 400)
      }
    })

    it('panel referencing a nonexistent site', async () => {
      const data = await exportData()
      ;(data.patchPanels![0] as Record<string, unknown>).site_id = randomUUID()
      await expectRejectedUnchanged(data)
    })

    it('socket referencing a nonexistent panel', async () => {
      const data = await exportData()
      ;(data.patchPanelSockets![0] as Record<string, unknown>).patch_panel_id = randomUUID()
      await expectRejectedUnchanged(data)
    })

    it('token referencing a nonexistent panel', async () => {
      const data = await exportData()
      ;(data.patchPanelTokens![0] as Record<string, unknown>).patch_panel_id = randomUUID()
      await expectRejectedUnchanged(data)
    })

    it('duplicate (panel, port_number)', async () => {
      const data = await exportData()
      data.patchPanelSockets!.push({ ...(data.patchPanelSockets![0] as Record<string, unknown>), id: randomUUID() })
      await expectRejectedUnchanged(data)
    })

    it('duplicate token value', async () => {
      const data = await exportData()
      data.patchPanelTokens!.push({ ...(data.patchPanelTokens![0] as Record<string, unknown>), id: randomUUID() })
      await expectRejectedUnchanged(data)
    })

    it('duplicate row id', async () => {
      const data = await exportData()
      data.patchPanels!.push({ ...(data.patchPanels![0] as Record<string, unknown>), slug: 'panel-b' })
      await expectRejectedUnchanged(data)
    })
  })

  it('users validation still rejects a payload without users, regardless of panel data', async () => {
    const data = await exportData()
    data.users = []
    await expectRejectedUnchanged(data, 400)
  })
})
