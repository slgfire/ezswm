import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { switchRepository } from '../server/repositories/switchRepository'
import { createSwitchSchema, updateSwitchSchema } from '../server/validators/switchSchemas'
import { IMPORTERS } from '../server/utils/entityImport'
import { restoreAll } from '../server/utils/dataRestore'
import { publicTokenRepository } from '../server/repositories/publicTokenRepository'
import publicSwitchHandler from '../server/api/p/[token].get'

const base = { site_id: 's', name: 'sw' }
const BAD_URLS = ['javascript:alert(1)', 'data:text/html,x', 'ftp://h/', 'https://user:pw@h/', 'https://u@h/', '//h/x', 'not a url', 'https://h/ x', `https://h/${'a'.repeat(2050)}`, '']

describe('switch management link validation', () => {
  it('accepts http(s) URLs (trimmed), protocols and explicit null on update', () => {
    expect(updateSwitchSchema.parse({ management_url: '  https://sw.local:8443/ui?x=1  ' }).management_url).toBe('https://sw.local:8443/ui?x=1')
    expect(updateSwitchSchema.parse({ management_protocol: 'http', management_url: null })).toMatchObject({ management_protocol: 'http', management_url: null })
    expect(updateSwitchSchema.parse({}).management_url).toBeUndefined()
    expect(createSwitchSchema.parse({ ...base, management_url: null }).management_url).toBeUndefined()
  })

  it.each(BAD_URLS)('rejects URL %#', (url) => {
    expect(updateSwitchSchema.safeParse({ management_url: url }).success).toBe(false)
    expect(createSwitchSchema.safeParse({ ...base, management_url: url }).success).toBe(false)
  })

  it('rejects unknown protocols and keeps management_ip validation unchanged', () => {
    expect(createSwitchSchema.safeParse({ ...base, management_protocol: 'ftp' }).success).toBe(false)
    expect(createSwitchSchema.safeParse({ ...base, management_ip: 'anything-goes' }).success).toBe(true)
  })
})

describe('switch management link persistence', () => {
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

  it('defaults to https/no url, updates, preserves on omission, clears on null and duplicates', async () => {
    const site = await seedSite(prisma)
    const sw = await switchRepository.create({ site_id: site.id, name: 'sw1', management_ip: '10.0.0.5', tags: [], configured_vlans: [] })
    expect(sw).toMatchObject({ management_protocol: 'https' })
    expect(sw.management_url).toBeUndefined()

    const set = await switchRepository.update(sw.id, { management_protocol: 'http', management_url: 'https://mgmt.example/ui' })
    expect(set).toMatchObject({ management_protocol: 'http', management_url: 'https://mgmt.example/ui' })

    const kept = await switchRepository.update(sw.id, { name: 'renamed' })
    expect(kept).toMatchObject({ management_protocol: 'http', management_url: 'https://mgmt.example/ui' })

    const copy = await switchRepository.duplicate(sw.id)
    expect(copy).toMatchObject({ management_protocol: 'http', management_url: 'https://mgmt.example/ui' })

    const cleared = await switchRepository.update(sw.id, { management_url: null as unknown as undefined })
    expect(cleared.management_url).toBeUndefined()
    expect(cleared.management_protocol).toBe('http')
    expect(cleared.management_ip).toBe('10.0.0.5')
  })

  it('seeded legacy rows read as https with no url', async () => {
    const seeded = await seedSwitch(prisma)
    const sw = await switchRepository.getById(seeded.id)
    expect(sw).toMatchObject({ management_protocol: 'https' })
    expect(sw?.management_url).toBeUndefined()
  })

  it('imports links, defaults blanks, and rejects unsafe rows without persisting them', async () => {
    const site = await seedSite(prisma)
    const result = await IMPORTERS.switches([
      { site_id: site.id, name: 'ok', management_protocol: 'HTTP', management_url: ' https://a.example/x ' },
      { site_id: site.id, name: 'legacy' },
      { site_id: site.id, name: 'blank', management_protocol: '', management_url: '' },
      { site_id: site.id, name: 'bad-url', management_url: 'javascript:alert(1)' },
      { site_id: site.id, name: 'bad-cred', management_url: 'https://u:p@h/' },
      { site_id: site.id, name: 'bad-proto', management_protocol: 'ftp' }
    ])
    expect(result.imported).toBe(3)
    expect(result.errors.map(e => e.row)).toEqual([4, 5, 6])
    const rows = Object.fromEntries((await prisma.switch.findMany()).map(r => [r.name, r]))
    expect(rows.ok).toMatchObject({ management_protocol: 'http', management_url: 'https://a.example/x' })
    expect(rows.legacy).toMatchObject({ management_protocol: 'https', management_url: null })
    expect(rows.blank).toMatchObject({ management_protocol: 'https', management_url: null })
    expect(rows['bad-url']).toBeUndefined()
  })

  function payload(sw: Record<string, unknown>) {
    const siteId = randomUUID()
    const now = '2026-01-01T00:00:00Z'
    return {
      schema: 'sqlite-v1',
      data: {
        users: [{ id: randomUUID(), username: 'admin', display_name: 'Admin', password_hash: 'x', role: 'admin', language: 'en', is_setup_user: true, created_at: now, updated_at: now }],
        sites: [{ id: siteId, slug: 'r', name: 'R', description: null, created_at: now, updated_at: now }],
        switches: [{ id: randomUUID(), site_id: siteId, slug: 'sw', name: 'sw', tags: '[]', configured_vlans: '[]', is_favorite: false, created_at: now, updated_at: now, ...sw }]
      }
    }
  }

  it('restores modern fields, and old backups as https/null', async () => {
    await restoreAll(prisma, payload({ management_protocol: 'http', management_url: 'http://10.0.0.9/' }))
    expect(await prisma.switch.findFirst()).toMatchObject({ management_protocol: 'http', management_url: 'http://10.0.0.9/' })
    await restoreAll(prisma, payload({}))
    expect(await prisma.switch.findFirst()).toMatchObject({ management_protocol: 'https', management_url: null })
  })

  it.each([
    { management_url: 'javascript:alert(1)' },
    { management_url: 'https://u:p@h/' },
    { management_url: 42 },
    { management_protocol: 'ftp' },
    { management_protocol: null }
  ])('rejects tampered backup %j before any write', async (bad) => {
    await restoreAll(prisma, payload({ name: 'keep' }))
    await expect(restoreAll(prisma, payload(bad))).rejects.toMatchObject({ statusCode: 400 })
    expect((await prisma.switch.findFirst())?.name).toBe('keep')
  })

  it('does not leak management fields in the public token view', async () => {
    const seeded = await seedSwitch(prisma)
    await prisma.switch.update({ where: { id: seeded.id }, data: { management_ip: '10.9.9.9', management_url: 'https://secret.example/', management_protocol: 'http' } })
    const token = await publicTokenRepository.create(seeded.id)
    const result = await publicSwitchHandler({ context: { params: { token: token.token } } } as never)
    const text = JSON.stringify(result)
    expect(text).not.toMatch(/management|secret\.example|10\.9\.9\.9/)
  })
})
