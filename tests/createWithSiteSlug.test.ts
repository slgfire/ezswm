import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { siteRepository } from '../server/repositories/siteRepository'
import { networkRepository } from '../server/repositories/networkRepository'
import { switchRepository } from '../server/repositories/switchRepository'
import { vlanRepository } from '../server/repositories/vlanRepository'

describe('create accepts site slug (regression for #168 → #169)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteUuid: string
  let siteSlug: string

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
    const seeded = await seedSite(prisma, { slug: 'main' })
    siteUuid = seeded.id
    siteSlug = (await siteRepository.getById(siteUuid))!.slug
    expect(siteSlug).toBe('main')
  })

  it('networkRepository.create resolves site slug to UUID', async () => {
    const net = await networkRepository.create({
      site_id: siteSlug, // ← slug, not UUID — mirrors what the create form sends
      name: 'Server-Net',
      subnet: '10.0.1.0/24',
      gateway: '10.0.1.1',
      dns_servers: []
    })
    expect(net.site_id).toBe(siteUuid)
    expect(net.slug).toBe('server-net')
  })

  it('networkRepository.create with explicit UUID still works', async () => {
    const net = await networkRepository.create({
      site_id: siteUuid,
      name: 'Backup-Net',
      subnet: '10.0.2.0/24',
      gateway: '10.0.2.1',
      dns_servers: []
    })
    expect(net.site_id).toBe(siteUuid)
  })

  it('networkRepository.create with unknown site returns 404', async () => {
    await expect(networkRepository.create({
      site_id: 'definitely-not-a-real-slug',
      name: 'Doomed',
      subnet: '10.0.3.0/24',
      gateway: '10.0.3.1',
      dns_servers: []
    })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('vlanRepository.create resolves site slug to UUID', async () => {
    const v = await vlanRepository.create({
      site_id: siteSlug,
      vlan_id: 100,
      name: 'Mgmt',
      status: 'active',
      color: '#EF4444'
    })
    expect(v.site_id).toBe(siteUuid)
    expect(v.vlan_id).toBe(100)
  })

  it('switchRepository.create resolves site slug to UUID', async () => {
    const sw = await switchRepository.create({
      site_id: siteSlug,
      name: 'core-01',
      tags: [],
      configured_vlans: []
    })
    expect(sw.site_id).toBe(siteUuid)
    expect(sw.slug).toBe('core-01')
  })
})
