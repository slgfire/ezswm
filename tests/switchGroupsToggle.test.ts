import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { createTestPrisma, seedSite, seedSwitch } from './testHelpers'
import { settingsRepository } from '../server/repositories/settingsRepository'
import { switchGroupRepository } from '../server/repositories/switchGroupRepository'
import { switchRepository } from '../server/repositories/switchRepository'
import { runJsonToPrismaMigration } from '../server/migrations/jsonToPrisma'

import listSwitchGroups from '../server/api/switch-groups/index.get'
import createSwitchGroup from '../server/api/switch-groups/index.post'
import getSwitchGroup from '../server/api/switch-groups/[id].get'
import updateSwitchGroup from '../server/api/switch-groups/[id].put'
import deleteSwitchGroup from '../server/api/switch-groups/[id].delete'
import sortSwitchGroups from '../server/api/switch-groups/sort.put'
import createSwitchRoute from '../server/api/switches/index.post'
import updateSwitchRoute from '../server/api/switches/[id].put'

describe('switch groups feature toggle', () => {
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

  it('defaults switch_groups_enabled to true in domain and DB', async () => {
    const defaults = await settingsRepository.get()
    expect(defaults.switch_groups_enabled).toBe(true)

    const row = await prisma.appSettings.create({
      data: {
        id: 'singleton',
        app_name: 'ezSWM',
        app_logo_url: null,
        default_vlan: null,
        default_port_status: 'down',
        port_speeds: '[]',
        setup_completed: false,
        sites_initialized: false,
        patch_panels_enabled: false
      }
    })
    expect(row.switch_groups_enabled).toBe(true)
  })

  it('uses legacy migration fallback true when switch_groups_enabled is missing', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'ezswm-sg-mig-'))
    try {
      writeFileSync(join(dataDir, 'sites.json'), JSON.stringify([]))
      writeFileSync(join(dataDir, 'users.json'), JSON.stringify([]))
      writeFileSync(join(dataDir, 'settings.json'), JSON.stringify({
        app_name: 'ezSWM',
        default_port_status: 'down',
        port_speeds: ['1G'],
        setup_completed: false,
        sites_initialized: false
      }))
      for (const file of ['layout-templates.json', 'switches.json', 'vlans.json', 'networks.json', 'ip-allocations.json', 'ip-ranges.json', 'lag-groups.json', 'public-tokens.json', 'activity.json']) {
        writeFileSync(join(dataDir, file), JSON.stringify([]))
      }
      writeFileSync(join(dataDir, 'topology-layouts.json'), JSON.stringify({}))

      await runJsonToPrismaMigration({ prisma, dataDir })
      const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: 'singleton' } })
      expect(settings.switch_groups_enabled).toBe(true)
    } finally {
      rmSync(dataDir, { recursive: true, force: true })
    }
  })

  it('returns 404 for all switch-group routes while disabled', async () => {
    const site = await seedSite(prisma)
    await createRouteUser(prisma)
    await settingsRepository.update({ switch_groups_enabled: false })
    const group = await switchGroupRepository.create({ site_id: site.id, name: 'Core' })

    await expect(listSwitchGroups({ query: {} } as never)).rejects.toMatchObject({ statusCode: 404 })
    await expect(createSwitchGroup({
      context: { auth: { userId: 'route-user' } },
      body: { site_id: site.id, name: 'Disabled Group' }
    } as never)).rejects.toMatchObject({ statusCode: 404 })
    await expect(getSwitchGroup({ context: { params: { id: group.id } }, query: {} } as never)).rejects.toMatchObject({ statusCode: 404 })
    await expect(updateSwitchGroup({
      context: { params: { id: group.id }, auth: { userId: 'route-user' } },
      query: {},
      body: { name: 'Renamed while disabled' }
    } as never)).rejects.toMatchObject({ statusCode: 404 })
    await expect(deleteSwitchGroup({
      context: { params: { id: group.id }, auth: { userId: 'route-user' } },
      query: {}
    } as never)).rejects.toMatchObject({ statusCode: 404 })
    await expect(sortSwitchGroups({ body: { order: [group.id] } } as never)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects direct group_id on switch POST/PUT while disabled, but allows standard edits', async () => {
    const site = await seedSite(prisma)
    const group = await switchGroupRepository.create({ site_id: site.id, name: 'Edge' })
    await createRouteUser(prisma)
    await settingsRepository.update({ switch_groups_enabled: false })

    const created = await createSwitchRoute({
      context: { auth: { userId: 'route-user' } },
      body: { site_id: site.id, name: 'sw-ok', tags: [], configured_vlans: [] }
    } as never) as { id: string }

    await expect(createSwitchRoute({
      context: { auth: { userId: 'route-user' } },
      body: { site_id: site.id, name: 'sw-reject-null', tags: [], configured_vlans: [], group_id: null }
    } as never)).rejects.toMatchObject({ statusCode: 400 })

    await expect(createSwitchRoute({
      context: { auth: { userId: 'route-user' } },
      body: { site_id: site.id, name: 'sw-reject-id', tags: [], configured_vlans: [], group_id: group.id }
    } as never)).rejects.toMatchObject({ statusCode: 400 })

    await expect(updateSwitchRoute({
      context: { params: { id: created.id }, auth: { userId: 'route-user' } },
      query: {},
      body: { group_id: null }
    } as never)).rejects.toMatchObject({ statusCode: 400 })

    const updated = await updateSwitchRoute({
      context: { params: { id: created.id }, auth: { userId: 'route-user' } },
      query: {},
      body: { name: 'sw-renamed' }
    } as never) as { name: string }
    expect(updated.name).toBe('sw-renamed')
  })

  it('preserves existing groups and memberships while disabled and after re-enable', async () => {
    const site = await seedSite(prisma)
    await createRouteUser(prisma)

    const group = await switchGroupRepository.create({ site_id: site.id, name: 'Access' })
    const sw = await seedSwitch(prisma, { site_id: site.id, name: 'sw-member', group_id: group.id })

    await settingsRepository.update({ switch_groups_enabled: false })

    const renamed = await updateSwitchRoute({
      context: { params: { id: sw.id }, auth: { userId: 'route-user' } },
      query: {},
      body: { name: 'sw-member-renamed' }
    } as never) as { id: string }
    expect(renamed.id).toBe(sw.id)

    const whileDisabled = await switchRepository.getById(sw.id)
    expect(whileDisabled?.group_id).toBe(group.id)

    await settingsRepository.update({ switch_groups_enabled: true })

    const listed = await listSwitchGroups({ query: { site_id: site.id } } as never) as { data: Array<{ id: string }> }
    expect(listed.data.some(item => item.id === group.id)).toBe(true)

    const loaded = await getSwitchGroup({ context: { params: { id: group.id } }, query: {} } as never) as { id: string }
    expect(loaded.id).toBe(group.id)

    const after = await switchRepository.getById(sw.id)
    expect(after?.group_id).toBe(group.id)
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
