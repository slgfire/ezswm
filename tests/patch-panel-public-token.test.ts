import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedSite } from './testHelpers'
import { patchPanelRepository } from '../server/repositories/patchPanelRepository'
import { patchPanelTokenRepository } from '../server/repositories/patchPanelTokenRepository'
import { settingsRepository } from '../server/repositories/settingsRepository'
import createPatchPanelToken from '../server/api/patch-panels/[id]/public-token/index.post'
import getPatchPanelToken from '../server/api/patch-panels/[id]/public-token/index.get'
import revokePatchPanelToken from '../server/api/patch-panels/[id]/public-token/index.delete'
import getPublicPatchPanel from '../server/api/p/pp/[token].get'

describe('patch panel public token persistence and API', () => {
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

  it('enforces one active token, supports revoke/recreate, and get returns latest record', async () => {
    await settingsRepository.update({ patch_panels_enabled: true })
    const site = await seedSite(prisma, { slug: 'hq' })
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Main Panel', port_count: 12 })

    const first = await createPatchPanelToken({ context: { params: { id: panel.id } }, query: {} } as never) as { id: string; token: string }
    expect(first.token).toHaveLength(32)

    await expect(createPatchPanelToken({
      context: { params: { id: panel.slug } },
      query: { siteId: 'hq' }
    } as never)).rejects.toMatchObject({ statusCode: 409 })

    const revoked = await revokePatchPanelToken({
      context: { params: { id: panel.slug } },
      query: { siteId: site.id }
    } as never) as { id: string; revoked_at: string | null }
    expect(revoked.id).toBe(first.id)
    expect(revoked.revoked_at).toBeTruthy()

    const latestAfterRevoke = await getPatchPanelToken({
      context: { params: { id: panel.slug } },
      query: { siteId: site.id }
    } as never) as { id: string; revoked_at: string | null }
    expect(latestAfterRevoke.id).toBe(first.id)
    expect(latestAfterRevoke.revoked_at).toBeTruthy()

    const second = await createPatchPanelToken({
      context: { params: { id: panel.slug } },
      query: { siteId: 'hq' }
    } as never) as { id: string; token: string }
    expect(second.id).not.toBe(first.id)
    expect(second.token).toHaveLength(32)
    expect(second.token).not.toBe(first.token)
  })

  it('serves only allow-listed public patch panel fields and updates last access', async () => {
    await settingsRepository.update({ patch_panels_enabled: true })
    const site = await seedSite(prisma)
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Panel Public', port_count: 12 })
    const socket = panel.sockets[0]!
    await patchPanelRepository.updateSocket(panel.id, socket.id, {
      side: 'L',
      outlet_number: 'A-01',
      location: 'Rack-1',
      tested: true
    })

    const token = await patchPanelTokenRepository.create(panel.id)
    const result = await getPublicPatchPanel({ context: { params: { token: token.token } } } as never) as { name: string; sockets: Array<Record<string, unknown>> }

    expect(Object.keys(result).sort()).toEqual(['name', 'sockets'])
    expect(result.name).toBe('Panel Public')
    expect(result.sockets.length).toBe(12)
    expect(Object.keys(result.sockets[0]!).sort()).toEqual(['location', 'outlet_number', 'port_number', 'side', 'tested'])
    expect(result.sockets[0]).toMatchObject({
      port_number: 1,
      outlet_number: 'A-01',
      location: 'Rack-1',
      side: 'L',
      tested: true
    })

    const updatedToken = await patchPanelTokenRepository.getByToken(token.token)
    expect(updatedToken?.last_access_at).toBeTruthy()
  })

  it('returns 404 for invalid and revoked public tokens', async () => {
    await settingsRepository.update({ patch_panels_enabled: true })
    const site = await seedSite(prisma)
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Panel 404', port_count: 12 })

    await expect(getPublicPatchPanel({ context: { params: { token: 'missing' } } } as never))
      .rejects.toMatchObject({ statusCode: 404 })

    const token = await patchPanelTokenRepository.create(panel.id)
    await revokePatchPanelToken({ context: { params: { id: panel.id } }, query: {} } as never)

    await expect(getPublicPatchPanel({ context: { params: { token: token.token } } } as never))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns 404 for lifecycle and public endpoints when patch panels are disabled', async () => {
    const site = await seedSite(prisma, { slug: 'disabled' })
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Disabled Panel', port_count: 12 })
    const token = await patchPanelTokenRepository.create(panel.id)

    await expect(createPatchPanelToken({ context: { params: { id: panel.id } }, query: {} } as never))
      .rejects.toMatchObject({ statusCode: 404 })
    await expect(getPatchPanelToken({ context: { params: { id: panel.id } }, query: {} } as never))
      .rejects.toMatchObject({ statusCode: 404 })
    await expect(revokePatchPanelToken({ context: { params: { id: panel.id } }, query: {} } as never))
      .rejects.toMatchObject({ statusCode: 404 })
    await expect(getPublicPatchPanel({ context: { params: { token: token.token } } } as never))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('cascades patch panel token deletion when patch panel is deleted', async () => {
    await settingsRepository.update({ patch_panels_enabled: true })
    const site = await seedSite(prisma)
    const panel = await patchPanelRepository.create({ site_id: site.id, name: 'Cascade Panel', port_count: 12 })
    await patchPanelTokenRepository.create(panel.id)
    expect(await prisma.patchPanelToken.count()).toBe(1)

    await patchPanelRepository.delete(panel.id)

    expect(await prisma.patchPanelToken.count()).toBe(0)
  })
})
