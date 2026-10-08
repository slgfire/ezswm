import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { asCookie, installH3Globals, makeEvent, seedLocalUser, tokenFor } from './helpers/h3Harness'
import { patchPanelRepository } from '../server/repositories/patchPanelRepository'
import { settingsRepository } from '../server/repositories/settingsRepository'

type Handler = (event: unknown) => unknown
interface Res { status: number, body: unknown }

// The shared harness only routes a fixed table, so run the REAL auth middleware and the
// REAL token route handlers directly. NOTE: the vitest setup stubs setResponseStatus, so
// literal 201/204 statuses are NOT observable here (only thrown statusCodes / 200 default).
const ROUTES = {
  'sw:GET': () => import('../server/api/switches/[id]/public-token/index.get'),
  'sw:POST': () => import('../server/api/switches/[id]/public-token/index.post'),
  'sw:DELETE': () => import('../server/api/switches/[id]/public-token/index.delete'),
  'pp:GET': () => import('../server/api/patch-panels/[id]/public-token/index.get'),
  'pp:POST': () => import('../server/api/patch-panels/[id]/public-token/index.post'),
  'pp:DELETE': () => import('../server/api/patch-panels/[id]/public-token/index.delete'),
  'pub:sw': () => import('../server/api/p/[token].get'),
  'pub:pp': () => import('../server/api/p/pp/[token].get')
} as const

async function call(kind: 'sw' | 'pp', method: 'GET' | 'POST' | 'DELETE', id: string, cookies?: Record<string, string>): Promise<Res> {
  const prefix = kind === 'sw' ? 'switches' : 'patch-panels'
  const event = makeEvent({ method, path: `/api/${prefix}/${id}/public-token`, cookies })
  event.context.params = { id }
  try {
    const { default: mw } = await import('../server/middleware/auth')
    await (mw as Handler)(event)
    const mod = await ROUTES[`${kind}:${method}`]()
    return { status: 200, body: await (mod.default as Handler)(event) }
  } catch (err) {
    return { status: (err as { statusCode?: number }).statusCode ?? 500, body: undefined }
  }
}

async function callPublic(kind: 'sw' | 'pp', token: string): Promise<number> {
  const event = makeEvent({ path: `/api/p/${kind === 'pp' ? 'pp/' : ''}${token}` })
  event.context.params = { token }
  try {
    const mod = await ROUTES[`pub:${kind}`]()
    await (mod.default as Handler)(event)
    return 200
  } catch (err) {
    return (err as { statusCode?: number }).statusCode ?? 500
  }
}

describe('viewer QR / public-token access (GET-only, no side effects)', () => {
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
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })
  beforeEach(async () => {
    await resetDb()
    await settingsRepository.update({ patch_panels_enabled: true })
  })

  async function setup() {
    const site = await seedSite(prisma, { slug: 'hq' })
    const sw = await seedSwitch(prisma, { site_id: site.id, slug: 'sw1' })
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Panel', port_count: 12 })
    const viewer = await seedLocalUser(prisma, { username: 'viewer', role: 'viewer' })
    const admin = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
    return {
      sw, panel,
      v: asCookie(tokenFor(viewer)),
      a: asCookie(tokenFor(admin))
    }
  }
  const snapshot = async () => ({
    sw: await prisma.publicToken.findMany({ orderBy: { id: 'asc' } }),
    pp: await prisma.patchPanelToken.findMany({ orderBy: { id: 'asc' } })
  })

  it('viewer GET returns the existing active latest token (same id/token, not revoked) without creating rows', async () => {
    const { sw, panel, v, a } = await setup()
    const swTok = (await call('sw', 'POST', sw.id, a)).body as { id: string, token: string }
    const ppTok = (await call('pp', 'POST', panel.id, a)).body as { id: string, token: string }
    const before = await snapshot()
    for (const [kind, id, tok] of [['sw', sw.id, swTok], ['pp', panel.id, ppTok]] as const) {
      const r = await call(kind, 'GET', id, v)
      expect(r.status).toBe(200)
      expect(r.body).toMatchObject({ id: tok.id, token: tok.token, revoked_at: null })
    }
    expect(await snapshot()).toEqual(before)
  })

  it('viewer GET with no token yields 404 and creates no rows', async () => {
    const { sw, panel, v } = await setup()
    expect((await call('sw', 'GET', sw.id, v)).status).toBe(404)
    expect((await call('pp', 'GET', panel.id, v)).status).toBe(404)
    expect(await prisma.publicToken.count()).toBe(0)
    expect(await prisma.patchPanelToken.count()).toBe(0)
  })

  it('viewer GET of a latest revoked token is 200 including revoked_at, while the public API is 404', async () => {
    const { sw, panel, v, a } = await setup()
    const swTok = (await call('sw', 'POST', sw.id, a)).body as { id: string, token: string }
    const ppTok = (await call('pp', 'POST', panel.id, a)).body as { id: string, token: string }
    expect((await call('sw', 'DELETE', sw.id, a)).status).toBe(200)
    expect((await call('pp', 'DELETE', panel.id, a)).status).toBe(200)
    const before = await snapshot()
    for (const [kind, id, tok] of [['sw', sw.id, swTok], ['pp', panel.id, ppTok]] as const) {
      const r = await call(kind, 'GET', id, v)
      expect(r.status).toBe(200)
      expect(r.body).toMatchObject({ id: tok.id, token: tok.token })
      expect((r.body as { revoked_at: string | null }).revoked_at).toBeTruthy()
      expect(await callPublic(kind, tok.token)).toBe(404)
    }
    expect(await snapshot()).toEqual(before)
  })

  it('patch panel module off: viewer GET is 404, creates nothing and leaves an existing token unchanged', async () => {
    const { sw, panel, v, a } = await setup()
    await call('pp', 'POST', panel.id, a)
    const before = await snapshot()
    await settingsRepository.update({ patch_panels_enabled: false })
    expect((await call('pp', 'GET', panel.id, v)).status).toBe(404)
    expect(await snapshot()).toEqual(before)
    await prisma.patchPanelToken.deleteMany()
    expect((await call('pp', 'GET', panel.id, v)).status).toBe(404)
    expect(await prisma.patchPanelToken.count()).toBe(0)
    expect(sw.id).toBeTruthy()
  })

  it('viewer POST and DELETE are 403 for both resources and leave rows/ids/revoked_at unchanged', async () => {
    const { sw, panel, v, a } = await setup()
    await call('sw', 'POST', sw.id, a)
    await call('pp', 'POST', panel.id, a)
    const before = await snapshot()
    for (const method of ['POST', 'DELETE'] as const) {
      expect((await call('sw', method, sw.id, v)).status).toBe(403)
      expect((await call('pp', method, panel.id, v)).status).toBe(403)
    }
    expect(await snapshot()).toEqual(before)
    expect(before.sw.every(t => t.revoked_at === null)).toBe(true)
    expect(before.pp.every(t => t.revoked_at === null)).toBe(true)
  })

  it('unauthenticated GET is 401 for both resources', async () => {
    const { sw, panel, a } = await setup()
    await call('sw', 'POST', sw.id, a)
    expect((await call('sw', 'GET', sw.id)).status).toBe(401)
    expect((await call('pp', 'GET', panel.id)).status).toBe(401)
  })

  it('admin POST creates one safe DTO token, a duplicate is 409, and DELETE revokes it', async () => {
    const { sw, panel, a } = await setup()
    for (const [kind, id, table] of [['sw', sw.id, 'publicToken'], ['pp', panel.id, 'patchPanelToken']] as const) {
      const created = await call(kind, 'POST', id, a)
      expect(created.body).toMatchObject({ revoked_at: null })
      const dto = created.body as Record<string, unknown>
      expect(typeof dto.token).toBe('string')
      expect(Object.keys(dto).sort()).toEqual(
        [kind === 'sw' ? 'switch_id' : 'patch_panel_id', 'id', 'token', 'created_at', 'revoked_at', 'last_access_at'].sort()
      )
      expect((await call(kind, 'POST', id, a)).status).toBe(409)
      expect(await (prisma[table] as unknown as { count: () => Promise<number> }).count()).toBe(1)
      const del = await call(kind, 'DELETE', id, a)
      expect(del.status).toBe(200)
      expect((del.body as { id: string, revoked_at: string | null }).id).toBe(dto.id)
      expect((del.body as { revoked_at: string | null }).revoked_at).toBeTruthy()
    }
  })
})
