import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { existsSync, readdirSync } from 'node:fs'
import { createServer, request as httpRequest, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createTestPrisma } from './testHelpers'
import { seedLocalUser, setOidcRuntime, resetOidcRuntime, tokenFor } from './helpers/h3Harness'
import { layoutTemplateRepository } from '../server/repositories/layoutTemplateRepository'

/**
 * Layout-template POST/PUT HTTP boundary: REAL h3 router + REAL node HTTP + REAL auth middleware +
 * REAL route handlers/Zod schemas + real Prisma repositories (isolated test DB).
 */

type H3Module = Record<string, unknown> & {
  createApp: () => { use: (...a: unknown[]) => unknown }
  createRouter: () => { add: (path: string, handler: unknown, method: string) => unknown, handler: unknown }
  toNodeListener: (app: unknown) => (req: unknown, res: unknown) => void
}

function locateH3(): string {
  const store = join(process.cwd(), 'node_modules', '.pnpm')
  const dir = readdirSync(store).filter(d => /^h3@1\.\d+\.\d+$/.test(d)).sort().at(-1)
  const file = dir && join(store, dir, 'node_modules', 'h3', 'dist', 'index.mjs')
  if (!file || !existsSync(file)) throw new Error('h3@1.x not found in node_modules/.pnpm')
  return file
}

interface Res { status: number, body: string, json: () => Record<string, unknown> }

const block = (speed: string) => ({ type: 'qsfp', count: 2, start_index: 1, rows: 1, default_speed: speed })
const payload = (name: string, speed: string) => ({ name, units: [{ unit_number: 1, blocks: [block(speed)] }] })

describe('layout-template POST/PUT validation over REAL h3 HTTP', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let server: Server
  let port: number
  let auth: Record<string, string>

  beforeAll(async () => {
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma

    const h3 = (await import(pathToFileURL(locateH3()).href)) as H3Module
    for (const [k, v] of Object.entries(h3)) (globalThis as Record<string, unknown>)[k] = v
    const app = h3.createApp()
    const { default: middleware } = await import('../server/middleware/auth')
    app.use(middleware)
    const router = h3.createRouter()
    router.add('/api/layout-templates', (await import('../server/api/layout-templates/index.post')).default, 'post')
    router.add('/api/layout-templates/:id', (await import('../server/api/layout-templates/[id].put')).default, 'put')
    app.use(router.handler)
    server = createServer(h3.toNodeListener(app) as never)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()))
    resetOidcRuntime()
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    setOidcRuntime({})
    const admin = await seedLocalUser(prisma, { username: 'tpl-admin', role: 'admin' })
    auth = { cookie: `ezswm_token=${tokenFor(admin)}` }
  })

  const send = (method: string, path: string, body: unknown) => new Promise<Res>((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = httpRequest({
      host: '127.0.0.1', port, method, path,
      headers: { ...auth, 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(data)) }
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c as Buffer))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({ status: res.statusCode ?? 0, body: text, json: () => JSON.parse(text) })
      })
    })
    req.on('error', reject)
    req.end(data)
  })

  const counts = async () => ({
    templates: await prisma.layoutTemplate.count(),
    activity: await prisma.activityEntry.count()
  })

  function expectGenericRejection(res: Res) {
    expect(res.status).toBe(400)
    expect(res.body).not.toContain('25G')
    // h3 includes an empty stack array even for a sanitized production error.
    const body = res.json()
    if ('stack' in body) expect(body.stack).toEqual([])
    expect(res.body).not.toMatch(/invalid_enum|ZodError|"received"|"options"/i)
  }

  it('POST with invalid 25G default_speed -> generic 400, nothing created, no activity', async () => {
    const before = await counts()
    const res = await send('POST', '/api/layout-templates', payload('bad-25g', '25G'))
    expectGenericRejection(res)
    expect(await counts()).toEqual(before)
  })

  it('PUT with invalid 25G default_speed -> generic 400, template unchanged, no activity', async () => {
    const created = await layoutTemplateRepository.create(payload('orig', '10G') as never)
    const before = await counts()
    const res = await send('PUT', `/api/layout-templates/${created.id}`, payload('renamed', '25G'))
    expectGenericRejection(res)
    expect(await counts()).toEqual(before)
    const after = await layoutTemplateRepository.getById(created.id)
    expect(after?.name).toBe('orig')
    expect(after?.units[0]?.blocks[0]?.default_speed).toBe('10G')
  })

  it('POST with valid 40G -> 201, persisted default_speed 40G, activity logged', async () => {
    const res = await send('POST', '/api/layout-templates', payload('ok-40g', '40G'))
    expect(res.status).toBe(201)
    const id = res.json().id as string
    const stored = await layoutTemplateRepository.getById(id)
    expect(stored?.name).toBe('ok-40g')
    expect(stored?.units[0]?.blocks[0]?.default_speed).toBe('40G')
    expect(await prisma.activityEntry.count({ where: { entity_id: id, action: 'create', entity_type: 'layout_template' } })).toBe(1)
  })

  it('PUT with valid 40G -> 200, persisted default_speed 40G, activity logged', async () => {
    const created = await layoutTemplateRepository.create(payload('orig', '10G') as never)
    const res = await send('PUT', `/api/layout-templates/${created.id}`, payload('renamed', '40G'))
    expect(res.status).toBe(200)
    const stored = await layoutTemplateRepository.getById(created.id)
    expect(stored?.name).toBe('renamed')
    expect(stored?.units[0]?.blocks[0]?.default_speed).toBe('40G')
    expect(await prisma.activityEntry.count({ where: { entity_id: created.id, action: 'update', entity_type: 'layout_template' } })).toBe(1)
  })

  it('PUT for a missing template with an invalid body -> 404 (entity check precedes validation)', async () => {
    const before = await counts()
    const res = await send('PUT', '/api/layout-templates/does-not-exist', payload('x', '25G'))
    expect(res.status).toBe(404)
    expect(await counts()).toEqual(before)
  })
})
