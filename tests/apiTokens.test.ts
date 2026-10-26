import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'

import { createTestPrisma, seedNetwork, seedSite } from './testHelpers'
import { asCookie, dispatch, installH3Globals, makeEvent, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { apiTokenRepository, hashApiToken, API_TOKEN_LAST_USED_THROTTLE_MS } from '../server/repositories/apiTokenRepository'
import { userRepository } from '../server/repositories/userRepository'
import { evaluateApiTokenPolicy } from '../server/utils/requireAdmin'
import { restoreAll } from '../server/utils/dataRestore'
import { API_ROUTE_INVENTORY, MIXED_SAMPLES } from './fixtures/apiRouteInventory'

type Role = 'admin' | 'viewer'
const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
const future = (days = 30) => new Date(Date.now() + days * 864e5).toISOString()

describe('API tokens (real Prisma + real middleware)', () => {
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
    await prisma.oidcConfig.deleteMany()
    setOidcRuntime({})
  })

  const user = (username: string, role: Role = 'admin') => seedLocalUser(prisma, { username, role })
  const jwtOf = (u: { id: string, username: string, role: string }) => ({ cookies: asCookie(tokenFor(u)) })
  async function mint(u: { id: string }, name = 'ci', expires_at?: string | null) {
    const r = await apiTokenRepository.create(u.id, { name, expires_at })
    if (!r.ok) throw new Error(r.reason)
    return r.token
  }

  describe('creation and validation', () => {
    it('returns the secret once, stores only the SHA-256 digest, lists metadata only', async () => {
      const u = await user('a')
      const r = await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: '  mcp  ', expires_at: future() }, ...jwtOf(u) })
      expect(r.status).toBe(201)
      const created = r.body as { id: string, token: string, name: string }
      expect(created.token).toMatch(/^ezswm_[A-Za-z0-9_-]{32,}$/)
      expect(created.name).toBe('mcp')
      const row = await prisma.apiToken.findUniqueOrThrow({ where: { id: created.id } })
      expect(row.token_hash).toBe(hashApiToken(created.token))
      expect(JSON.stringify(row)).not.toContain(created.token)

      const list = await dispatch({ path: '/api/auth/tokens', ...jwtOf(u) })
      const text = JSON.stringify(list.body)
      expect(text).not.toContain(created.token)
      expect(text).not.toContain('token_hash')
      expect(Object.keys((list.body as object[])[0]!).sort()).toEqual(['created_at', 'expires_at', 'id', 'last_used_at', 'name'])
    })

    it.each([
      ['empty name', { name: '   ' }],
      ['long name', { name: 'x'.repeat(101) }],
      ['past expiry', { name: 'n', expires_at: new Date(Date.now() - 1000).toISOString() }],
      ['> 5 years', { name: 'n', expires_at: new Date(Date.now() + 6 * 365 * 864e5).toISOString() }],
      ['non-UTC offset', { name: 'n', expires_at: '2099-01-01T00:00:00+02:00' }],
      ['garbage expiry', { name: 'n', expires_at: 'tomorrow' }],
      ['unknown key', { name: 'n', user_id: 'x' }]
    ])('rejects %s with 400', async (_l, body) => {
      const u = await user('a')
      expect((await dispatch({ method: 'POST', path: '/api/auth/tokens', body, ...jwtOf(u) })).status).toBe(400)
    })

    it('enforces per-user unique name (409, case-sensitive) and max 10 incl. concurrent creates', async () => {
      const u = await user('a')
      const other = await user('b')
      await mint(u, 'dup')
      expect((await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: 'dup' }, ...jwtOf(u) })).status).toBe(409)
      expect((await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: 'DUP' }, ...jwtOf(u) })).status).toBe(201)
      await mint(other, 'dup') // other user may reuse

      await apiTokenRepository.deleteAllByUser(u.id)
      const results = await Promise.all(Array.from({ length: 15 }, (_, i) => apiTokenRepository.create(u.id, { name: `t${i}` })))
      expect(results.filter(r => r.ok)).toHaveLength(10)
      expect(results.filter(r => !r.ok && r.reason === 'limit')).toHaveLength(5)
      expect(await prisma.apiToken.count({ where: { user_id: u.id } })).toBe(10)
      expect((await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: 'eleventh' }, ...jwtOf(u) })).status).toBe(409)

    })

    it('concurrent same-name creates yield exactly one token', async () => {
      const u = await user('a')
      const rs = await Promise.all([1, 2, 3, 4].map(() => apiTokenRepository.create(u.id, { name: 'same' })))
      expect(rs.filter(r => r.ok)).toHaveLength(1)
    })

    it('local accounts only: OIDC owner cannot create, and an existing OIDC-owned token is rejected', async () => {
      const { user: oidc } = await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp.example.com', subject: 's1', role: 'admin', displayName: 'O' })
      expect(await apiTokenRepository.create(oidc.id, { name: 'x' })).toMatchObject({ ok: false, reason: 'forbidden_owner' })
      // defensively inserted row for an OIDC owner never authenticates
      await prisma.apiToken.create({ data: { id: crypto.randomUUID(), name: 'x', token_hash: hashApiToken('ezswm_oidcowner'), user_id: oidc.id, created_at: new Date().toISOString() } })
      expect((await dispatch({ path: '/api/sites', headers: bearer('ezswm_oidcowner') })).status).toBe(401)
    })
  })

  describe('authentication', () => {
    it('authenticates, sets provenance and uses the DB role per request', async () => {
      const u = await user('adm')
      const t = await mint(u)
      const ok = await dispatch({ path: '/api/auth/me', headers: bearer(t.token) })
      expect(ok.status).toBe(200)
      expect(ok.auth).toMatchObject({ userId: u.id, authType: 'api_token', apiTokenId: t.id, apiTokenName: 'ci', role: 'admin' })
      // JWT provenance
      expect((await dispatch({ path: '/api/auth/me', ...jwtOf(u) })).auth).toMatchObject({ authType: 'jwt' })
      expect((await dispatch({ path: '/api/auth/me', ...jwtOf(u) })).auth?.apiTokenId).toBeUndefined()

      // role change takes effect immediately
      await prisma.user.update({ where: { id: u.id }, data: { role: 'viewer' } })
      const w = await dispatch({ method: 'POST', path: '/api/sites', headers: bearer(t.token), body: {} })
      expect(w.status).toBe(403)
      expect((await dispatch({ path: '/api/sites', headers: bearer(t.token) })).status).not.toBe(403)
    })

    it('generic 401 for unknown, malformed, expired, revoked; no secret in the error', async () => {
      const u = await user('a')
      const expired = await mint(u, 'old')
      await prisma.apiToken.update({ where: { id: expired.id }, data: { expires_at: new Date(Date.now() - 1000).toISOString() } })
      const revoked = await mint(u, 'rev')
      await apiTokenRepository.deleteOwned(u.id, revoked.id)
      const messages = new Set<string>()
      for (const h of [bearer('ezswm_nope'), bearer(expired.token), bearer(revoked.token), bearer('ezswm_'), { authorization: 'ezswm_x' }, { authorization: 'Basic abc' }, { authorization: '' }, { authorization: 'Bearer' }]) {
        const r = await dispatch({ path: '/api/auth/me', headers: h })
        expect(r.status, JSON.stringify(h)).toBe(401)
        expect(JSON.stringify(r.error)).not.toContain(expired.token)
        messages.add(r.error?.message ?? '')
      }
      expect(messages.size).toBeLessThanOrEqual(1)
    })

    it('header/cookie provenance matrix', async () => {
      const u = await user('a')
      const t = await mint(u)
      const cookie = jwtOf(u).cookies
      // explicit invalid/non-Bearer header never falls back to a valid cookie
      expect((await dispatch({ path: '/api/auth/me', headers: { authorization: 'Basic abc' }, cookies: cookie })).status).toBe(401)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer('garbage'), cookies: cookie })).status).toBe(401)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer('ezswm_bad'), cookies: cookie })).status).toBe(401)
      // API token in cookie rejected, even valid
      expect((await dispatch({ path: '/api/auth/me', cookies: { ezswm_token: t.token } })).status).toBe(401)
      // valid header wins; valid JWT cookie alone works; valid JWT in header works
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(t.token), cookies: cookie })).auth?.authType).toBe('api_token')
      expect((await dispatch({ path: '/api/auth/me', ...jwtOf(u) })).status).toBe(200)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(tokenFor(u)) })).auth?.authType).toBe('jwt')
      // valid API token header + invalid cookie is fine (cookie ignored)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(t.token), cookies: { ezswm_token: 'junk' } })).status).toBe(200)
    })

    it('last_used_at is a DB-conditional throttled update (<= once / 60s)', async () => {
      const u = await user('a')
      const t = await mint(u)
      const at = new Date('2030-01-01T00:00:00Z')
      await apiTokenRepository.authenticate(t.token, at)
      const first = (await prisma.apiToken.findUniqueOrThrow({ where: { id: t.id } })).last_used_at
      expect(first).toBe(at.toISOString())
      await apiTokenRepository.authenticate(t.token, new Date(at.getTime() + API_TOKEN_LAST_USED_THROTTLE_MS - 1000))
      expect((await prisma.apiToken.findUniqueOrThrow({ where: { id: t.id } })).last_used_at).toBe(first)
      const later = new Date(at.getTime() + API_TOKEN_LAST_USED_THROTTLE_MS + 1000)
      await apiTokenRepository.authenticate(t.token, later)
      expect((await prisma.apiToken.findUniqueOrThrow({ where: { id: t.id } })).last_used_at).toBe(later.toISOString())
    })

    it('user deletion cascades; password change does not revoke; OIDC/JWT sessions unaffected', async () => {
      const u = await user('a')
      const admin = await user('boss')
      const t = await mint(u)
      await userRepository.update(u.id, { password_hash: '$2a$10$abcdefghijklmnopqrstuuWJ3xv0q9Z0g5l2H0zPq3n3e0dF5v1a2x' })
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(t.token) })).status).toBe(200)
      expect((await dispatch({ method: 'DELETE', path: `/api/users/${u.id}`, ...jwtOf(admin) })).status).toBe(204)
      expect(await prisma.apiToken.count()).toBe(0)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(t.token) })).status).toBe(401)
    })
  })

  describe('management routes', () => {
    it('viewers manage exactly their own tokens; foreign ids are 404 for everyone incl. admin', async () => {
      const v = await user('v', 'viewer')
      const admin = await user('boss')
      const vt = await mint(v, 'v1')
      const at = await mint(admin, 'a1')
      expect((await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: 'mine' }, ...jwtOf(v) })).status).toBe(201)
      expect((await dispatch({ method: 'DELETE', path: `/api/auth/tokens/${at.id}`, ...jwtOf(v) })).status).toBe(404)
      expect((await dispatch({ method: 'DELETE', path: `/api/auth/tokens/${vt.id}`, ...jwtOf(admin) })).status).toBe(404)
      expect(await prisma.apiToken.count({ where: { id: vt.id } })).toBe(1)
      expect((await dispatch({ method: 'DELETE', path: `/api/auth/tokens/${vt.id}`, ...jwtOf(v) })).status).toBe(204)
      // list only own
      expect(((await dispatch({ path: '/api/auth/tokens', ...jwtOf(admin) })).body as unknown[])).toHaveLength(1)
      // revoke all own only
      const r = await dispatch({ method: 'DELETE', path: '/api/auth/tokens', ...jwtOf(v) })
      expect(r.body).toEqual({ revoked: 1 })
      expect(await prisma.apiToken.count({ where: { user_id: admin.id } })).toBe(1)
    })

    it('viewers cannot reach admin per-user token routes; admin can (with 404 on mismatch)', async () => {
      const v = await user('v', 'viewer')
      const admin = await user('boss')
      const other = await user('o')
      const ot = await mint(other, 'o1')
      const vt = await mint(v, 'v1')
      expect((await dispatch({ path: `/api/users/${other.id}/tokens`, ...jwtOf(v) })).status).toBe(403)
      expect((await dispatch({ path: `/api/users/${v.id}/tokens`, ...jwtOf(v) })).status).toBe(403)
      const list = await dispatch({ path: `/api/users/${other.id}/tokens`, ...jwtOf(admin) })
      expect(list.status).toBe(200)
      expect(JSON.stringify(list.body)).not.toContain('token_hash')
      expect((await dispatch({ path: `/api/users/${crypto.randomUUID()}/tokens`, ...jwtOf(admin) })).status).toBe(404)
      expect((await dispatch({ method: 'DELETE', path: `/api/users/${other.id}/tokens/${vt.id}`, ...jwtOf(admin) })).status).toBe(404)
      expect(await prisma.apiToken.count({ where: { id: vt.id } })).toBe(1)
      expect((await dispatch({ method: 'DELETE', path: `/api/users/${other.id}/tokens/${ot.id}`, ...jwtOf(admin) })).status).toBe(204)
    })

    it('OIDC accounts cannot create tokens via the route (403)', async () => {
      const { user: oidc } = await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp.example.com', subject: 's2', role: 'viewer', displayName: 'O' })
      const r = await dispatch({ method: 'POST', path: '/api/auth/tokens', body: { name: 'x' }, skipMiddleware: true, headers: {}, cookies: {} })
      expect(r.status).toBe(401) // no auth context at all
      // direct handler call with an OIDC context
      const { default: h } = await import('../server/api/auth/tokens/index.post')
      const ev = { context: { auth: { userId: oidc.id, authType: 'jwt', role: 'viewer', authProvider: 'oidc', username: 'o' } }, body: { name: 'x' } }
      ;(globalThis as Record<string, unknown>).readBody = async (e: typeof ev) => e.body
      await expect((h as (e: unknown) => Promise<unknown>)(ev)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('API-token auth gets 403 on every token-management / account / credential route, for admin tokens too', async () => {
      const admin = await user('boss')
      const viewer = await user('v', 'viewer')
      const at = await mint(admin, 'a')
      const vt = await mint(viewer, 'v')
      const id = crypto.randomUUID()
      const routes: Array<[string, string]> = [
        ['GET', '/api/auth/tokens'], ['POST', '/api/auth/tokens'], ['DELETE', '/api/auth/tokens'], ['DELETE', `/api/auth/tokens/${at.id}`],
        ['GET', `/api/users/${admin.id}/tokens`], ['DELETE', `/api/users/${viewer.id}/tokens/${vt.id}`],
        ['GET', '/api/users'], ['POST', '/api/users'], ['PUT', `/api/users/${admin.id}`], ['PUT', `/api/users/${admin.id}/password`], ['DELETE', `/api/users/${id}`],
        ['GET', '/api/backup/export'], ['POST', '/api/backup/import'], ['POST', '/api/admin/recover-allocations'],
        ['GET', '/api/auth/oidc/config'], ['PUT', '/api/auth/oidc/config'], ['POST', '/api/auth/oidc/check']
      ]
      for (const tok of [at, vt]) {
        for (const [method, path] of routes) {
          expect((await dispatch({ method, path, headers: bearer(tok.token), body: {} })).status, `${method} ${path}`).toBe(403)
        }
      }
      expect(await prisma.apiToken.count()).toBe(2)
    })
  })

  describe('D6 deny contract', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const denied: Array<[string, string]> = [
      ['GET', `/api/switches/${id}/public-token`], ['POST', `/api/switches/${id}/public-token`], ['DELETE', `/api/switches/${id}/public-token`],
      ['GET', `/api/patch-panels/${id}/public-token`], ['POST', `/api/patch-panels/${id}/public-token`], ['DELETE', `/api/patch-panels/${id}/public-token/`],
      ['GET', '/api/data/export'], ['HEAD', '/api/data/export'], ['POST', '/api/data/import'], ['POST', '/api/data/import/x'],
      ['POST', '/api/import/templates'], ['POST', '/api/import/template/vlans'], ['POST', '/api/layout-templates/import'],
      ['GET', '/api/activity'], ['HEAD', '/api/activity'], ['GET', '/api/dashboard/stats'], ['HEAD', '/api/dashboard/stats'],
      ['GET', '/api/export/templates'],
      ['GET', `/api/layout-templates/${id}/export`], ['HEAD', `/api/layout-templates/${id}/export`], ['GET', `/API/Layout-Templates/${id}/export/`],
      ['PUT', '/api/settings'], ['POST', '/api/settings'], ['PATCH', '/api/settings'], ['DELETE', '/api/settings'],
      ['POST', `/api/activity/${id}/undo`],
      ['DELETE', `/api/device-types/${id}`],
      ['DELETE', `/api/sites/${id}`], ['DELETE', `/api/sites/${id}/`], ['DELETE', `/api/switches/${id}`], ['DELETE', `/api/switches/${id}/`],
      // normalization bypass attempts
      ['GET', '//api//data/export'], ['GET', '/api/./data/export'], ['GET', '/api/x/../data/export'], ['GET', '/api/data%2Fexport'], ['GET', '/API/Data/Export'],
      ['DELETE', `/api/sites/${id}%2F`], ['GET', `/api/switches/${id}/public-token/x`]
    ]
    it.each(denied)('denies %s %s for API tokens', (method, path) => {
      expect(evaluateApiTokenPolicy({ method, path })).toBe('forbidden')
    })

    const allowed: Array<[string, string]> = [
      ['GET', '/api/auth/me'], ['GET', '/api/settings'], ['GET', '/api/device-types'], ['POST', '/api/device-types'], ['PUT', `/api/device-types/${id}`],
      ['GET', '/api/sites'], ['GET', `/api/switches/${id}`], ['PUT', `/api/switches/${id}`], ['POST', '/api/switches'], ['PUT', `/api/switches/${id}/ports/bulk`],
      ['GET', '/api/export/vlans'], ['GET', '/api/export/vlans?format=csv'], ['GET', '/api/export/vlans?format=json'], ['HEAD', '/api/export/switches'],
      ['POST', '/api/import/vlans'], ['POST', '/api/import/networks/'], ['POST', '/api/import/switches'], ['POST', '/api/import/allocations'], ['POST', '/api/import/ranges'],
      ['GET', '/api/networks'], ['DELETE', `/api/networks/${id}`], ['DELETE', `/api/networks/${id}/allocations/${id}`],
      ['DELETE', `/api/networks/${id}/ranges/${id}`], ['DELETE', `/api/vlans/${id}`], ['DELETE', `/api/switches/${id}/lag-groups/${id}`],
      ['POST', `/api/networks/${id}/allocations`], ['PUT', `/api/vlans/${id}`], ['GET', '/api/import/template/vlans'],
      ['GET', '/api/search'], ['GET', '/api/switches/sort'],
      ['GET', '/api/layout-templates'], ['GET', `/api/layout-templates/${id}`], ['PUT', `/api/layout-templates/${id}`], ['DELETE', `/api/layout-templates/${id}`],
      ['POST', `/api/layout-templates/${id}/duplicate`]
    ]
    it.each(allowed)('allows %s %s for API tokens', (method, path) => {
      expect(evaluateApiTokenPolicy({ method, path })).toBe('allow')
    })

    it('end to end: admin API token gets 403 on raw data export while JWT still works; HEAD cannot bypass', async () => {
      setOidcRuntime({})
      const admin = await user('boss')
      const t = await mint(admin)
      expect((await dispatch({ path: '/api/data/export', headers: bearer(t.token) })).status).toBe(403)
      expect((await dispatch({ method: 'HEAD', path: '/api/data/export', headers: bearer(t.token) })).status).toBe(403)
      expect((await dispatch({ method: 'PUT', path: '/api/settings', headers: bearer(t.token), body: {} })).status).toBe(403)
      expect((await dispatch({ path: '/api/data/export', ...jwtOf(admin) })).status).toBe(200)
      expect((await dispatch({ path: '/api/settings', headers: bearer(t.token) })).status).toBe(200)
    })

    it('viewer API token: GET allowed by role, writes 403 by role', async () => {
      const v = await user('v', 'viewer')
      const t = await mint(v)
      expect((await dispatch({ path: '/api/auth/me', headers: bearer(t.token) })).status).toBe(200)
      expect((await dispatch({ method: 'POST', path: '/api/device-types', headers: bearer(t.token), body: {} })).status).toBe(403)
    })

    it('JWT sessions are unchanged by the API-token deny list', async () => {
      const admin = await user('boss')
      for (const [m, p] of [['GET', '/api/data/export'], ['GET', '/api/users'], ['GET', '/api/backup/export']] as const) {
        expect((await dispatch({ method: m, path: p, ...jwtOf(admin) })).status, p).toBe(200)
      }
    })
  })

  describe('backup / export / restore', () => {
    it('exports contain no apiToken rows or hashes', async () => {
      setOidcRuntime({})
      const admin = await user('boss')
      const t = await mint(admin)
      for (const path of ['/api/backup/export', '/api/data/export']) {
        const r = await dispatch({ path, ...jwtOf(admin) })
        expect(r.status).toBe(200)
        const text = JSON.stringify(r.body)
        expect(text).not.toContain(hashApiToken(t.token))
        expect(text).not.toContain(t.token)
        expect(Object.keys((r.body as { data: object }).data).filter(k => /api.?token/i.test(k))).toEqual([])
      }
      // checked-in list of exported tables: adding one forces a conscious decision
      const backup = await dispatch({ path: '/api/backup/export', ...jwtOf(admin) })
      expect(Object.keys((backup.body as { data: object }).data).sort()).toEqual([
        'activity', 'customDeviceTypes', 'ipAllocations', 'ipRanges', 'lagGroups', 'layoutTemplates', 'networks', 'oidcConfig',
        'patchPanelSockets', 'patchPanelTokens', 'patchPanels', 'ports', 'publicTokens', 'settings', 'sites', 'switchGroups',
        'switches', 'topologyLayouts', 'users', 'vlans'
      ])
    })

    it('restore deletes ALL existing tokens (old backup) and never inserts payload apiTokens', async () => {
      setOidcRuntime({})
      const admin = await user('boss')
      await mint(admin, 'a')
      await mint(admin, 'b')
      const backup = (await dispatch({ path: '/api/backup/export', ...jwtOf(admin) })).body as { data: Record<string, unknown[]> }
      await restoreAll(prisma, JSON.parse(JSON.stringify(backup)))
      expect(await prisma.apiToken.count()).toBe(0)

      const survivor = await prisma.user.findFirstOrThrow()
      await mint(survivor, 'again')
      const hostile = JSON.parse(JSON.stringify(backup))
      hostile.data.apiTokens = [{ id: crypto.randomUUID(), name: 'evil', token_hash: hashApiToken('ezswm_evil'), user_id: survivor.id, created_at: new Date().toISOString() }]
      hostile.data.ApiToken = hostile.data.apiTokens
      await restoreAll(prisma, hostile)
      expect(await prisma.apiToken.count()).toBe(0)
    })
  })

  describe('A6 sanitized documentation export/import', () => {
    it('exports only allowlisted documentation fields for API tokens, keeps JWT output raw, blocks templates', async () => {
      setOidcRuntime({})
      const admin = await user('exp-admin')
      const t = await mint(admin, 'exp')
      const site = await seedSite(prisma, { slug: 'exp-site' })
      await seedNetwork(prisma, { site_id: site.id, slug: 'exp-net', name: 'Exp Net', subnet: '10.50.0.0/24' })

      const res = await dispatch({ path: '/api/export/networks?type=networks&format=json', headers: bearer(t.token) })
      expect(res.status).toBe(200)
      const rows = res.body as Array<Record<string, unknown>>
      expect(rows.length).toBeGreaterThan(0)
      expect(Object.keys(rows[0]!).sort()).toEqual(
        ['created_at', 'description', 'dns_servers', 'gateway', 'id', 'name', 'site_id', 'subnet', 'updated_at', 'vlan_id'].sort()
      )
      expect(JSON.stringify(rows)).not.toMatch(/password|token_hash|token|secret/i)

      // JWT export keeps its previous (raw row) shape.
      const jwtRows = (await dispatch({ path: '/api/export/networks?type=networks&format=json', ...jwtOf(admin) })).body as Array<Record<string, unknown>>
      expect(jwtRows[0]).toHaveProperty('slug')

      expect((await dispatch({ path: '/api/export/templates?type=templates&format=json', headers: bearer(t.token) })).status).toBe(403)
    })

    it('imports documentation rows but keeps the raw import families denied', async () => {
      setOidcRuntime({})
      const admin = await user('imp-admin')
      const t = await mint(admin, 'imp')
      const site = await seedSite(prisma, { slug: 'imp-site' })

      const res = await dispatch({
        method: 'POST',
        path: '/api/import/vlans',
        headers: bearer(t.token),
        body: [{ site_id: site.id, vlan_id: 77, name: 'VLAN 77' }]
      })
      expect(res.status).toBe(200)
      expect((res.body as { imported: number }).imported).toBe(1)
      expect(await prisma.vlan.count({ where: { name: 'VLAN 77' } })).toBe(1)

      expect((await dispatch({ method: 'POST', path: '/api/data/import', headers: bearer(t.token), body: {} })).status).toBe(403)
      expect((await dispatch({ method: 'POST', path: '/api/import/templates', headers: bearer(t.token), body: [] })).status).toBe(403)
      expect((await dispatch({ method: 'POST', path: '/api/layout-templates/import', headers: bearer(t.token), body: {} })).status).toBe(403)
    })

    it('layout-template export is denied (403) for admin and viewer API tokens, GET and HEAD; JWT and template listing stay allowed', async () => {
      setOidcRuntime({})
      const admin = await user('boss')
      const viewer = await user('v', 'viewer')
      const tpl = await prisma.layoutTemplate.create({ data: { id: crypto.randomUUID(), name: 'Export Me', units: '[]', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } })
      const path = `/api/layout-templates/${tpl.id}/export`
      for (const u of [admin, viewer]) {
        const t = await mint(u, `t-${u.username}`)
        for (const method of ['GET', 'HEAD']) {
          expect((await dispatch({ method, path, headers: bearer(t.token) })).status, `${u.username} ${method}`).toBe(403)
        }
        expect((await dispatch({ path: '/api/layout-templates', headers: bearer(t.token) })).status).toBe(200)
      }
      for (const u of [admin, viewer]) {
        const r = await dispatch({ path, ...jwtOf(u) })
        expect(r.status, `JWT ${u.username}`).toBe(200)
      }
    })
  })

})

describe('API route inventory vs token policy (static gate, not runtime coverage)', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)])
  // server/api/<path>/[param]/index.<method>.ts -> "METHOD /api/<path>/:param"
  // Only a whole `index` path segment is dropped (users/index.get.ts -> /api/users, usersindex.get.ts -> /api/usersindex).
  const routeKey = (rel: string) => {
    const m = /^(.*)\.(get|post|put|patch|delete)\.ts$/.exec(rel)
    if (!m) throw new Error(`Unrecognized route file ${rel}`)
    const segs = m[1]!.split('/').map(s => s.replace(/\[(\w+)\]/g, ':$1'))
    if (segs[segs.length - 1] === 'index') segs.pop()
    return `${m[2]!.toUpperCase()} ${['/api', ...segs].join('/')}`
  }
  const keysOf = (rels: string[]) => {
    const keys = rels.map(routeKey)
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i)
    if (dup.length) throw new Error(`Duplicate route keys: ${dup.join(', ')}`)
    return keys.sort()
  }
  const discover = (dir = join(__dirname, '../server/api')) => keysOf(walk(dir).map(f => f.slice(dir.length + 1).split('\\').join('/')))
  const unclassified = (found: string[]) => found.filter(r => !(r in API_ROUTE_INVENTORY))

  it('every server/api route file is classified and no stale entries remain', () => {
    const found = discover()
    expect(unclassified(found), 'route(s) missing from tests/fixtures/apiRouteInventory.ts').toEqual([])
    expect(Object.keys(API_ROUTE_INVENTORY).filter(r => !found.includes(r)), 'stale inventory entries').toEqual([])
  })

  it('route key mapping drops only a whole index segment and rejects duplicates', () => {
    expect(keysOf(['users/index.get.ts', 'usersindex.get.ts', 'a/index/index.get.ts', 'index.get.ts', 'x/[id]/index.put.ts']))
      .toEqual(['GET /api', 'GET /api/a/index', 'GET /api/users', 'GET /api/usersindex', 'PUT /api/x/:id'].sort())
    expect(() => keysOf(['users/index.get.ts', 'users.get.ts'])).toThrow(/Duplicate/)
  })

  it('a new route fails classification until the inventory is updated (self-check)', () => {
    expect(unclassified([...discover(), 'GET /api/brand-new-route'])).toEqual(['GET /api/brand-new-route'])
  })

  it('real auth middleware: inventory public routes need no credential, every other route returns 401 without one', async () => {
    installH3Globals()
    const { default: middleware } = await import('../server/middleware/auth')
    const concrete = (p: string) => p.replace(/:(\w+)/g, '$1-x')
    for (const [route, access] of Object.entries(API_ROUTE_INVENTORY)) {
      const [method, path] = route.split(' ') as [string, string]
      const run = () => (middleware as (e: unknown) => Promise<unknown>)(makeEvent({ method, path: concrete(path) }))
      if (access === 'public') await expect(run(), route).resolves.toBeUndefined()
      else await expect(run(), route).rejects.toMatchObject({ statusCode: 401 })
    }
    // mixed routes must be protected for every sample too (unknown entity included)
    for (const [method, path] of MIXED_SAMPLES) {
      await expect((middleware as (e: unknown) => Promise<unknown>)(makeEvent({ method, path })), `${method} ${path}`).rejects.toMatchObject({ statusCode: 401 })
    }
  })

  it('every mixed route has both an allow and a deny sample', () => {
    for (const [route, access] of Object.entries(API_ROUTE_INVENTORY)) {
      if (access !== 'mixed') continue
      const [method, path] = route.split(' ') as [string, string]
      const prefix = path.slice(0, path.indexOf(':'))
      for (const want of ['allow', 'deny']) {
        expect(MIXED_SAMPLES.some(([m, p, a]) => m === method && p.startsWith(prefix) && a === want), `${route} needs a ${want} sample`).toBe(true)
      }
    }
  })

  it('inventory expectations match evaluateApiTokenPolicy (public routes are not policy-checked)', () => {
    for (const [route, access] of Object.entries(API_ROUTE_INVENTORY)) {
      if (access === 'public' || access === 'mixed') continue
      const [method, path] = route.split(' ') as [string, string]
      expect(evaluateApiTokenPolicy({ method, path: path.replace(/:(\w+)/g, '$1-x') }), route)
        .toBe(access === 'allow' ? 'allow' : 'forbidden')
    }
    for (const [method, path, access] of MIXED_SAMPLES) {
      expect(evaluateApiTokenPolicy({ method, path }), `${method} ${path}`).toBe(access === 'allow' ? 'allow' : 'forbidden')
    }
  })
})
