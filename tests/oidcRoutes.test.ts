import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'

import { createTestPrisma } from './testHelpers'
import { ProviderMockIdp, type IdpScenario } from './helpers/mockIdp'
import {
  asCookie, dispatch, installH3Globals, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor, type DispatchResult
} from './helpers/h3Harness'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { clearOidcClientCache } from '../server/utils/oidc/client'
import { OIDC_BINDING_COOKIE } from '../server/utils/oidc/session'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { oidcLoginTxnRepository } from '../server/repositories/oidcLoginTxnRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const CB = '/api/auth/oidc/callback'

describe('OIDC routes (real handlers + real middleware, real HTTP mock IdP)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  const idp = new ProviderMockIdp()

  beforeAll(async () => {
    installH3Globals()
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
    await idp.start()
  })

  afterAll(async () => {
    idp.stop()
    resetOidcRuntime()
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    await prisma.oidcLoginTxn.deleteMany()
    await prisma.oidcConfig.deleteMany()
    clearOidcClientCache()
    resetOidcRuntime()
    setOidcRuntime({ oidcEncryptionKey: KEY_B64, publicBaseUrl: '' })
    idp.reset()
  })

  async function configure(over: Record<string, unknown> = {}, withSecret = true) {
    return oidcConfigRepository.update({
      enabled: true,
      issuer: idp.issuer,
      client_id: idp.clientId,
      client_secret_ciphertext: withSecret ? encryptOidcSecret(idp.clientSecret, parseOidcEncryptionKey(KEY_B64)) : null,
      admin_groups: ['admins'],
      viewer_groups: ['viewers'],
      allow_http_issuer: true,
      ...over
    })
  }

  const cookieOf = (r: DispatchResult, name: string) => r.setCookies.find(c => c.name === name)

  async function start(cookies: Record<string, string> = {}, query = '', extra: { headers?: Record<string, string>, https?: boolean } = {}) {
    return dispatch({ path: `/api/auth/oidc/start${query}`, cookies, ...extra })
  }

  async function callback(authUrl: string, scenario: IdpScenario, cookies: Record<string, string>) {
    const q = idp.prepare(authUrl, scenario)
    return dispatch({ path: `${CB}?${q.toString()}`, cookies })
  }

  const admin = (over: IdpScenario = {}): IdpScenario => ({ idClaims: { groups: ['admins'] }, ...over })

  describe('public status', () => {
    it('is exactly {enabled} and needs no authentication', async () => {
      const off = await dispatch({ path: '/api/auth/oidc/status' })
      expect(off.body).toEqual({ enabled: false })
      await configure()
      const on = await dispatch({ path: '/api/auth/oidc/status' })
      expect(on.status).toBe(200)
      expect(on.body).toEqual({ enabled: true })
    })

    it('reports disabled when the key is missing or wrong (config still enabled)', async () => {
      await configure()
      setOidcRuntime({ oidcEncryptionKey: '' })
      expect((await dispatch({ path: '/api/auth/oidc/status' })).body).toEqual({ enabled: false })
      setOidcRuntime({ oidcEncryptionKey: randomBytes(32).toString('base64') })
      expect((await dispatch({ path: '/api/auth/oidc/status' })).body).toEqual({ enabled: false })
    })
  })

  describe('start', () => {
    it('redirects to the IdP with PKCE/state/nonce and sets a hardened binding cookie', async () => {
      await configure()
      const r = await start()
      expect(r.status).toBe(302)
      const u = new URL(r.redirect!.location)
      expect(u.origin).toBe(idp.issuer)
      expect(u.searchParams.get('redirect_uri')).toBe(`http://ezswm.test${CB}`)
      expect(u.searchParams.get('code_challenge_method')).toBe('S256')
      const c = cookieOf(r, OIDC_BINDING_COOKIE)!
      expect(c.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(c.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/auth/oidc', secure: false })
      expect(r.headers['cache-control']).toBe('no-store')
    })

    it('ignores X-Forwarded-* and uses canonical PUBLIC_BASE_URL (secure cookie on https base)', async () => {
      await configure()
      const spoof = { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' }
      const plain = await start({}, '', { headers: spoof })
      expect(new URL(plain.redirect!.location).searchParams.get('redirect_uri')).toBe(`http://ezswm.test${CB}`)
      expect(cookieOf(plain, OIDC_BINDING_COOKIE)!.options.secure).toBe(false)

      setOidcRuntime({ publicBaseUrl: 'https://sso.example.com' })
      const canon = await start({}, '', { headers: spoof })
      expect(new URL(canon.redirect!.location).searchParams.get('redirect_uri')).toBe(`https://sso.example.com${CB}`)
      expect(cookieOf(canon, OIDC_BINDING_COOKIE)!.options.secure).toBe(true)
    })

    it('redirects to /login with a safe code when SSO is not usable', async () => {
      const r = await start()
      expect(r.redirect!.location).toBe('/login?oidc_error=oidc_not_configured')
      await configure()
      setOidcRuntime({ oidcEncryptionKey: '' })
      expect((await start()).redirect!.location).toBe('/login?oidc_error=oidc_unavailable')
    })

    it('passes the per-browser pending-attempt limit through as 429', async () => {
      await configure()
      const first = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(first, OIDC_BINDING_COOKIE)!.value }
      let last = first
      for (let i = 0; i < 12; i++) last = await start(cookies)
      expect(last.status).toBe(429)
    })
  })

  describe('callback', () => {
    it('two tabs share one binding cookie; completing one keeps the binding and the other transaction usable', async () => {
      await configure()
      const tab1 = await start()
      const bind = cookieOf(tab1, OIDC_BINDING_COOKIE)!.value
      const cookies = { [OIDC_BINDING_COOKIE]: bind }
      const tab2 = await start(cookies)
      expect(cookieOf(tab2, OIDC_BINDING_COOKIE)).toBeUndefined() // stable binding: not re-issued
      expect(await oidcLoginTxnRepository.countPending()).toBe(2)

      const done1 = await callback(tab1.redirect!.location, admin(), cookies)
      expect(done1.redirect).toEqual({ location: '/', status: 302 })
      const session = cookieOf(done1, 'ezswm_token')!
      expect(session.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
      expect(done1.deletedCookies).not.toContain(OIDC_BINDING_COOKIE)
      expect(cookieOf(done1, OIDC_BINDING_COOKIE)).toBeUndefined()
      expect(await oidcLoginTxnRepository.countPending()).toBe(1)

      const done2 = await callback(tab2.redirect!.location, admin(), cookies)
      expect(done2.redirect!.location).toBe('/')
      expect(cookieOf(done2, 'ezswm_token')).toBeTruthy()
      expect(await prisma.user.count()).toBe(1) // same identity, one account
    })

    it('replaying a consumed callback yields a safe login error and no session', async () => {
      await configure()
      const s = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const q = idp.prepare(s.redirect!.location, admin())
      const first = await dispatch({ path: `${CB}?${q}`, cookies })
      expect(cookieOf(first, 'ezswm_token')).toBeTruthy()
      const replay = await dispatch({ path: `${CB}?${q}`, cookies })
      expect(replay.redirect!.location).toBe('/login?oidc_error=oidc_transaction_invalid')
      expect(cookieOf(replay, 'ezswm_token')).toBeUndefined()
    })

    it('rejects a callback without / with a different binding cookie (and does not burn the transaction)', async () => {
      await configure()
      const s = await start()
      const good = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const q = idp.prepare(s.redirect!.location, admin())
      const none = await dispatch({ path: `${CB}?${q}` })
      expect(none.redirect!.location).toBe('/login?oidc_error=oidc_transaction_invalid')
      const other = await dispatch({ path: `${CB}?${q}`, cookies: { [OIDC_BINDING_COOKIE]: randomBytes(32).toString('base64url') } })
      expect(other.redirect!.location).toBe('/login?oidc_error=oidc_transaction_invalid')
      expect(cookieOf(other, 'ezswm_token')).toBeUndefined()
      const ok = await dispatch({ path: `${CB}?${q}`, cookies: good })
      expect(cookieOf(ok, 'ezswm_token')).toBeTruthy()
    })

    it('issues a JWT carrying ap/osv/orev; the session works through the real middleware', async () => {
      await configure()
      const s = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const done = await callback(s.redirect!.location, admin(), cookies)
      const token = cookieOf(done, 'ezswm_token')!.value
      const claims = jwt.decode(token) as Record<string, unknown>
      const cfg = await oidcConfigRepository.get()
      expect(claims).toMatchObject({ ap: 'oidc', osv: 0, orev: cfg.config_revision, role: 'admin' })
      const me = await dispatch({ path: '/api/sites', cookies: asCookie(token) })
      expect(me.status).toBe(200)
    })

    it('marks the session cookie secure only for an https canonical base', async () => {
      await configure()
      setOidcRuntime({ publicBaseUrl: 'https://sso.example.com' })
      const s = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const done = await callback(s.redirect!.location, admin(), cookies)
      expect(cookieOf(done, 'ezswm_token')!.options.secure).toBe(true)
    })

    it('preserves a safe same-origin return_to and neutralises open redirects', async () => {
      await configure()
      const cases: Array<[string, string]> = [
        ['/sites/home?tab=1', '/sites/home?tab=1'],
        ['//evil.example', '/'],
        ['https://evil.example/x', '/'],
        ['/\\evil.example', '/'],
        ['/api/users', '/'],
        ['/login', '/'],
        ['javascript:alert(1)', '/']
      ]
      let cookies: Record<string, string> = {}
      for (const [input, expected] of cases) {
        const s = await start(cookies, `?return_to=${encodeURIComponent(input)}`)
        const c = cookieOf(s, OIDC_BINDING_COOKIE)
        if (c) cookies = { [OIDC_BINDING_COOKIE]: c.value }
        const done = await callback(s.redirect!.location, admin(), cookies)
        expect(done.redirect!.location, input).toBe(expected)
      }
    })

    it('maps failures to safe login codes only (no detail leaks), creating no user', async () => {
      await configure()
      const s = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const denied = await callback(s.redirect!.location, { idClaims: { groups: ['nobody'] } }, cookies)
      expect(denied.redirect!.location).toBe('/login?oidc_error=oidc_access_denied')
      expect(cookieOf(denied, 'ezswm_token')).toBeUndefined()

      const s2 = await start(cookies)
      const state = new URL(s2.redirect!.location).searchParams.get('state')
      const idpError = await dispatch({ path: `${CB}?error=access_denied&error_description=secret%20detail&state=${state}`, cookies })
      expect(idpError.redirect!.location).toBe('/login?oidc_error=oidc_provider_error')
      expect(await prisma.user.count()).toBe(0)
    })

    it('rejects duplicated protocol parameters and malformed requests', async () => {
      await configure()
      const dup = await dispatch({ path: `${CB}?code=a&code=b&state=s` })
      expect(dup.redirect!.location).toBe('/login?oidc_error=oidc_invalid_request')
      const huge = await dispatch({ path: `${CB}?code=${'a'.repeat(5000)}&state=s` })
      expect(huge.redirect!.location).toBe('/login?oidc_error=oidc_invalid_request')
      const empty = await dispatch({ path: CB })
      expect(empty.redirect!.location).toMatch(/^\/login\?oidc_error=oidc_/)
    })

    it('public client (no secret, auth method none) completes a login end-to-end', async () => {
      idp.reset({ authMethods: ['none'] })
      await configure({}, false)
      const s = await start()
      const cookies = { [OIDC_BINDING_COOKIE]: cookieOf(s, OIDC_BINDING_COOKIE)!.value }
      const done = await callback(s.redirect!.location, admin(), cookies)
      expect(cookieOf(done, 'ezswm_token')).toBeTruthy()
      expect(idp.tokenRequests.at(-1)!.authorization).toBe('')
      expect(idp.tokenRequests.at(-1)!.params.get('client_secret')).toBeNull()
    })
  })

  describe('admin config GET/PUT', () => {
    let adminCookie: Record<string, string>
    beforeEach(async () => {
      const a = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      adminCookie = asCookie(tokenFor(a))
    })

    const put = (body: unknown) => dispatch({ method: 'PUT', path: '/api/auth/oidc/config', cookies: adminCookie, body })
    const get = () => dispatch({ path: '/api/auth/oidc/config', cookies: adminCookie })

    it('GET never returns secret material', async () => {
      await configure()
      const r = await get()
      const text = JSON.stringify(r.body)
      expect(text).not.toContain(idp.clientSecret)
      expect(text).not.toContain('ciphertext')
      expect(text).not.toContain(KEY_B64)
      expect(r.body).toMatchObject({ client_secret_configured: true, encryption_key_ready: true, secret_decryptable: true, callback_url: `http://ezswm.test${CB}` })
      expect(Object.keys(r.body as object)).not.toContain('client_secret')
    })

    it('PUT stores the secret encrypted, returns only a boolean, retains when omitted, clears explicitly', async () => {
      const r1 = await put({ issuer: idp.issuer, client_id: 'cid', client_secret: 'plain-secret-value', allow_http_issuer: true })
      expect(r1.status).toBe(200)
      expect(JSON.stringify(r1.body)).not.toContain('plain-secret-value')
      expect(r1.body).toMatchObject({ client_secret_configured: true })
      const row = await prisma.oidcConfig.findFirst()
      expect(row?.client_secret_ciphertext).toBeTruthy()
      expect(row?.client_secret_ciphertext).not.toContain('plain-secret-value')
      const rev = (r1.body as { config_revision: number }).config_revision

      const retained = await put({ scopes: ['openid', 'profile', 'email'] })
      expect(retained.body).toMatchObject({ client_secret_configured: true })
      expect((retained.body as { config_revision: number }).config_revision).toBe(rev + 1)
      expect((await prisma.oidcConfig.findFirst())?.client_secret_ciphertext).toBe(row?.client_secret_ciphertext)

      const noop = await put({ scopes: ['openid', 'profile', 'email'] })
      expect((noop.body as { config_revision: number }).config_revision).toBe(rev + 1)

      const cleared = await put({ client_secret_clear: true })
      expect(cleared.body).toMatchObject({ client_secret_configured: false })
      expect((await prisma.oidcConfig.findFirst())?.client_secret_ciphertext).toBeNull()
    })

    it('rejects secret + clear together, unknown fields, and bad issuers', async () => {
      expect((await put({ client_secret: 'x', client_secret_clear: true })).status).toBe(400)
      expect((await put({ surprise: 1 })).status).toBe(400)
      expect((await put({ issuer: 'ftp://x' })).status).toBe(400)
      const http = await put({ issuer: 'http://idp.local' })
      expect(http.status).toBe(400)
      expect((await put({ issuer: 'http://idp.local', allow_http_issuer: true })).status).toBe(200)
    })

    it('refuses to store a secret without a usable key, and errors never echo the secret', async () => {
      setOidcRuntime({ oidcEncryptionKey: '' })
      const r = await put({ client_secret: 'super-secret-xyz' })
      expect(r.status).toBe(400)
      expect(JSON.stringify(r)).not.toContain('super-secret-xyz')
      expect((await prisma.oidcConfig.findFirst())?.client_secret_ciphertext ?? null).toBeNull()
    })

    it('refuses to enable with an undecryptable stored secret, or without issuer/client', async () => {
      await configure({ enabled: false })
      setOidcRuntime({ oidcEncryptionKey: randomBytes(32).toString('base64') })
      expect((await put({ enabled: true })).status).toBe(400)
      await prisma.oidcConfig.deleteMany()
      setOidcRuntime({ oidcEncryptionKey: KEY_B64 })
      expect((await put({ enabled: true })).status).toBe(400)
    })

    it('a public client (no secret) can be enabled through PUT', async () => {
      const r = await put({ issuer: idp.issuer, client_id: 'public-client', allow_http_issuer: true, enabled: true })
      expect(r.status, JSON.stringify(r.error)).toBe(200)
      expect(r.body).toMatchObject({ enabled: true, client_secret_configured: false })
    })

    it('a config change invalidates in-flight transactions', async () => {
      await configure()
      await start()
      expect(await oidcLoginTxnRepository.countPending()).toBe(1)
      await put({ admin_groups: ['admins', 'ops'] })
      expect(await oidcLoginTxnRepository.countPending()).toBe(0)
    })
  })

  describe('admin check (saved config, read-only)', () => {
    let adminCookie: Record<string, string>
    beforeEach(async () => {
      adminCookie = asCookie(tokenFor(await seedLocalUser(prisma, { username: 'root', role: 'admin' })))
    })
    const check = (body?: unknown) => dispatch({ method: 'POST', path: '/api/auth/oidc/check', cookies: adminCookie, body })

    it('validates the SAVED config, ignores the request body, mutates nothing', async () => {
      await configure()
      const before = await prisma.oidcConfig.findFirst()
      const r = await check({ issuer: 'https://attacker.example', client_id: 'x' })
      expect(r.body).toMatchObject({ ok: true, issuer: idp.issuer, token_endpoint_auth_method: 'client_secret_basic' })
      expect((r.body as { warnings: string[] }).warnings).toContain('insecure_http_issuer')
      expect(JSON.stringify(r.body)).not.toContain(idp.clientSecret)
      expect(idp.tokenRequests).toHaveLength(0) // discovery only, no login
      const after = await prisma.oidcConfig.findFirst()
      expect(after).toEqual(before)
    })

    it('returns safe codes for not-configured / key / failure cases', async () => {
      expect((await check()).body).toEqual({ ok: false, code: 'not_configured' })
      await configure()
      setOidcRuntime({ oidcEncryptionKey: '' })
      expect((await check()).body).toEqual({ ok: false, code: 'encryption_key_unavailable' })
      setOidcRuntime({ oidcEncryptionKey: randomBytes(32).toString('base64') })
      expect((await check()).body).toEqual({ ok: false, code: 'secret_undecryptable' })
      setOidcRuntime({ oidcEncryptionKey: KEY_B64 })
      await oidcConfigRepository.update({ allow_http_issuer: false })
      const r = await check()
      expect((r.body as { ok: boolean }).ok).toBe(false)
      expect(idp.hits).toEqual([])
    })
  })
})
