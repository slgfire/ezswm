import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { createTestPrisma, seedNetwork, seedSite, seedSwitch } from './testHelpers'
import { asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { apiTokenRepository } from '../server/repositories/apiTokenRepository'
import { activityRepository } from '../server/repositories/activityRepository'
import { evaluateApiTokenPolicy } from '../server/utils/requireAdmin'

const now = () => new Date().toISOString()
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })

describe('MCP activity DTO + safe undo (plan A7)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let siteId: string
  let networkId: string

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
    setOidcRuntime({})
    siteId = (await seedSite(prisma, { slug: 'hq' })).id
    networkId = (await seedNetwork(prisma, { site_id: siteId, slug: 'mgmt', subnet: '10.0.7.0/24' })).id
  })

  const admin = () => seedLocalUser(prisma, { username: `a-${randomUUID().slice(0, 6)}`, role: 'admin' })
  const mint = async (u: { id: string }) => {
    const created = await apiTokenRepository.create(u.id, { name: 'mcp' })
    if (!created.ok) throw new Error(created.reason)
    return created.token
  }
  const alloc = (ip = '10.0.7.10', hostname = 'host') => prisma.ipAllocation.create({
    data: { id: randomUUID(), network_id: networkId, ip_address: ip, hostname, status: 'assigned', created_at: now(), updated_at: now() }
  })
  const logEntry = (input: { user_id?: string, action: 'create' | 'update' | 'delete', entity_type: string, entity_id: string, entity_name?: string, previous_state?: Record<string, unknown>, metadata?: Record<string, unknown> }) =>
    activityRepository.log({ user_id: input.user_id ?? '', action: input.action, entity_type: input.entity_type, entity_id: input.entity_id, entity_name: input.entity_name ?? 'e', ...(input.previous_state ? { previous_state: input.previous_state } : {}), ...(input.metadata ? { metadata: input.metadata } : {}) })

  describe('sanitized DTO', () => {
    it('is allowed for API tokens, bounded, and never exposes raw state/metadata', async () => {
      const u = await admin()
      const token = await mint(u)
      await logEntry({
        user_id: u.id,
        action: 'update',
        entity_type: 'ip_allocation',
        entity_id: randomUUID(),
        metadata: { auth_type: 'api_token', secret: 'SHOULD_NOT_LEAK' },
        previous_state: { ip_address: '10.0.7.9', secret: 'SHOULD_NOT_LEAK' }
      })

      const res = await dispatch({ path: '/api/activity/mcp?limit=10', headers: bearer(token.token) })
      expect(res.status).toBe(200)
      const body = res.body as { data: Array<Record<string, unknown>>, total: number, limit: number, offset: number }
      expect(body.data).toHaveLength(1)
      expect(body.data[0]!.actor_display).toBe(u.username)
      expect(body.data[0]!.undoable).toBe(true)
      expect(body.data[0]!.undo_reason).toBeUndefined()
      expect(JSON.stringify(body)).not.toContain('SHOULD_NOT_LEAK')
      for (const banned of ['previous_state', 'metadata', 'changes']) {
        expect(JSON.stringify(body.data[0])).not.toContain(banned)
      }

      expect((await dispatch({ path: '/api/activity/mcp?limit=1000', headers: bearer(token.token) })).status).toBe(400)
      expect((await dispatch({ path: '/api/activity/mcp?offset=-1', headers: bearer(token.token) })).status).toBe(400)
    })

    it('marks unsupported inverses not undoable with a reason', async () => {
      const u = await admin()
      const token = await mint(u)
      await logEntry({ action: 'create', entity_type: 'site', entity_id: siteId })
      await logEntry({ action: 'update', entity_type: 'switch', entity_id: randomUUID() })

      const res = await dispatch({ path: '/api/activity/mcp', headers: bearer(token.token) })
      const data = (res.body as { data: Array<{ undoable: boolean, undo_reason?: string }> }).data
      expect(data.every(e => e.undoable === false && typeof e.undo_reason === 'string')).toBe(true)
    })

    it('keeps raw activity and dashboard stats denied for API tokens but unchanged for JWT', async () => {
      const u = await admin()
      const token = await mint(u)
      expect((await dispatch({ path: '/api/activity', headers: bearer(token.token) })).status).toBe(403)
      expect((await dispatch({ path: '/api/dashboard/stats', headers: bearer(token.token) })).status).toBe(403)
      expect((await dispatch({ path: '/api/activity', cookies: asCookie(tokenFor(u)) })).status).toBe(200)
    })
  })

  describe('safe undo', () => {
    it('previews then executes a create undo through the A5 guarded delete and attributes the audit entry', async () => {
      const u = await admin()
      const token = await mint(u)
      const row = await alloc()
      const log = await logEntry({ action: 'create', entity_type: 'ip_allocation', entity_id: row.id, entity_name: row.ip_address })

      const preview = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, headers: bearer(token.token) })
      expect(preview.status).toBe(200)
      const pv = preview.body as { preview: boolean, undoToken: string, impactToken: string, inverse: string }
      expect(pv.preview).toBe(true)
      expect(pv.undoToken).toBeTruthy()
      expect(await prisma.ipAllocation.count({ where: { id: row.id } })).toBe(1)

      const missing = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo?confirm=true`, headers: bearer(token.token) })
      expect(missing.status).toBe(400)

      const executed = await dispatch({
        method: 'POST',
        path: `/api/activity/mcp/${log.id}/undo?confirm=true&expectedUndoToken=${pv.undoToken}`,
        headers: bearer(token.token)
      })
      expect(executed.status).toBe(200)
      expect((executed.body as { success: boolean }).success).toBe(true)
      expect(await prisma.ipAllocation.count({ where: { id: row.id } })).toBe(0)

      const { entries } = await activityRepository.list()
      const undoEntry = entries.find(e => (e.metadata as { undid_entry_id?: string } | undefined)?.undid_entry_id === log.id)
      expect(undoEntry).toBeTruthy()
      expect(undoEntry!.metadata).toMatchObject({ auth_type: 'api_token', api_token_id: token.id, undo_contract: 'safe_v1' })
      expect(JSON.stringify(undoEntry!.metadata)).not.toContain(token.token)
    })

    it('409s on a stale create undo without mutating or writing a success entry', async () => {
      const u = await admin()
      const token = await mint(u)
      const row = await alloc()
      const log = await logEntry({ action: 'create', entity_type: 'ip_allocation', entity_id: row.id })

      const preview = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, headers: bearer(token.token) })
      const undoToken = (preview.body as { undoToken: string }).undoToken

      await prisma.ipAllocation.update({ where: { id: row.id }, data: { hostname: 'changed' } })

      const res = await dispatch({
        method: 'POST',
        path: `/api/activity/mcp/${log.id}/undo?confirm=true&expectedUndoToken=${undoToken}`,
        headers: bearer(token.token)
      })
      expect(res.status).toBe(409)
      expect(await prisma.ipAllocation.count({ where: { id: row.id } })).toBe(1)
      expect(await prisma.activityEntry.count({ where: { metadata: { contains: 'safe_v1' } } })).toBe(0)
    })

    it('restores a previous_state update snapshot', async () => {
      const u = await admin()
      const token = await mint(u)
      const row = await alloc('10.0.7.11', 'before')
      const previous_state = { ...row, created_at: row.created_at, updated_at: row.updated_at }
      await prisma.ipAllocation.update({ where: { id: row.id }, data: { hostname: 'after' } })
      const log = await logEntry({ action: 'update', entity_type: 'ip_allocation', entity_id: row.id, previous_state })

      const preview = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, headers: bearer(token.token) })
      const undoToken = (preview.body as { undoToken: string }).undoToken
      const res = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo?confirm=true&expectedUndoToken=${undoToken}`, headers: bearer(token.token) })
      expect(res.status).toBe(200)
      expect((await prisma.ipAllocation.findUniqueOrThrow({ where: { id: row.id } })).hostname).toBe('before')
    })

    it('recreates a deleted row from previous_state', async () => {
      const u = await admin()
      const token = await mint(u)
      const row = await alloc('10.0.7.12', 'gone')
      const previous_state = { ...row, created_at: row.created_at, updated_at: row.updated_at }
      await prisma.ipAllocation.delete({ where: { id: row.id } })
      const log = await logEntry({ action: 'delete', entity_type: 'ip_allocation', entity_id: row.id, entity_name: row.ip_address, previous_state })

      const preview = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, headers: bearer(token.token) })
      const undoToken = (preview.body as { undoToken: string }).undoToken
      const res = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo?confirm=true&expectedUndoToken=${undoToken}`, headers: bearer(token.token) })
      expect(res.status).toBe(200)
      expect((await prisma.ipAllocation.findUniqueOrThrow({ where: { id: row.id } })).hostname).toBe('gone')
    })

    it('422s forbidden/unsupported inverses (site create, switch update, layout template)', async () => {
      const u = await admin()
      const token = await mint(u)
      const sw = await seedSwitch(prisma, { site_id: siteId })
      const ids = await Promise.all([
        logEntry({ action: 'create', entity_type: 'site', entity_id: siteId }),
        logEntry({ action: 'update', entity_type: 'switch', entity_id: sw.id, previous_state: {} }),
        logEntry({ action: 'create', entity_type: 'layout_template', entity_id: randomUUID() })
      ])
      for (const log of ids) {
        const res = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, headers: bearer(token.token) })
        expect(res.status).toBe(422)
      }
      expect(await prisma.site.count()).toBe(1)
    })

    it('keeps the legacy undo route denied for API tokens and allows admin JWT on the safe route', async () => {
      const u = await admin()
      const token = await mint(u)
      const row = await alloc('10.0.7.13')
      const log = await logEntry({ action: 'create', entity_type: 'ip_allocation', entity_id: row.id })
      expect((await dispatch({ method: 'POST', path: `/api/activity/${log.id}/undo`, headers: bearer(token.token) })).status).toBe(403)

      const preview = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo`, cookies: asCookie(tokenFor(u)) })
      const undoToken = (preview.body as { undoToken: string }).undoToken
      const res = await dispatch({ method: 'POST', path: `/api/activity/mcp/${log.id}/undo?confirm=true&expectedUndoToken=${undoToken}`, cookies: asCookie(tokenFor(u)) })
      expect(res.status).toBe(200)
    })

    it('has the exact API-token policy exceptions for the new routes', () => {
      const id = '11111111-1111-4111-8111-111111111111'
      expect(evaluateApiTokenPolicy({ method: 'GET', path: '/api/activity/mcp' })).toBe('allow')
      expect(evaluateApiTokenPolicy({ method: 'POST', path: `/api/activity/mcp/${id}/undo` })).toBe('allow')
      expect(evaluateApiTokenPolicy({ method: 'GET', path: '/api/activity' })).toBe('forbidden')
      expect(evaluateApiTokenPolicy({ method: 'POST', path: `/api/activity/${id}/undo` })).toBe('forbidden')
    })
  })
})
