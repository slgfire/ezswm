import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { ProviderMockIdp, type IdpScenario } from './helpers/mockIdp'
import { CookieJar, startH3Server, type H3TestServer, type HttpResult } from './helpers/h3Server'
import { asCookie, resetOidcRuntime, seedLocalUser, setOidcRuntime, tokenFor } from './helpers/h3Harness'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { clearOidcClientCache } from '../server/utils/oidc/client'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { oidcLoginTxnRepository } from '../server/repositories/oidcLoginTxnRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const CB = '/api/auth/oidc/callback'
const BIND = 'ezswm_oidc_bind'
const pctAll = (s: string) => [...s].map(c => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')

/** Raw attribute list of a Set-Cookie line, lower-cased (without the name=value pair). */
const attrsOf = (line: string) => line.split(';').slice(1).map(a => a.trim().toLowerCase())
const findCookie = (r: HttpResult, name: string) => r.setCookies.find(c => c.startsWith(`${name}=`))

describe('OIDC over REAL h3 + real HTTP (raw event.path, wire cookies, header-derived origin)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  let srv: H3TestServer
  const idp = new ProviderMockIdp()

  beforeAll(async () => {
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
    await idp.start()
    srv = await startH3Server()
  })

  afterAll(async () => {
    await srv.close()
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

  const configure = (over: Record<string, unknown> = {}, withSecret = true) => oidcConfigRepository.update({
    enabled: true,
    issuer: idp.issuer,
    client_id: idp.clientId,
    client_secret_ciphertext: withSecret ? encryptOidcSecret(idp.clientSecret, parseOidcEncryptionKey(KEY_B64)) : null,
    admin_groups: ['admins'],
    viewer_groups: ['viewers'],
    allow_http_issuer: true,
    ...over
  })

  const get = (path: string, jar?: CookieJar, headers: Record<string, string> = {}) =>
    srv.request({ path, headers: { ...(jar?.header() ?? {}), ...headers } })

  /** start → returns the IdP authorization URL; the jar receives Set-Cookie like a browser. */
  async function start(jar: CookieJar, query = '', headers: Record<string, string> = {}) {
    const r = await get(`/api/auth/oidc/start${query}`, jar, headers)
    jar.apply(r.setCookies)
    return r
  }

  const callbackPath = (authUrl: string, scenario: IdpScenario, encode = false) => {
    const q = idp.prepare(authUrl, scenario)
    const code = q.get('code')!
    const state = q.get('state')!
    return encode
      ? `${CB}?${pctAll('code')}=${pctAll(code)}&${pctAll('state')}=${pctAll(state)}`
      : `${CB}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
  }
  const admin: IdpScenario = { idClaims: { groups: ['admins'] } }

  it('public status/start/callback need no auth; admin endpoints 401 (real middleware, real router)', async () => {
    await configure()
    const status = await get('/api/auth/oidc/status')
    expect(status.status).toBe(200)
    expect(status.json()).toEqual({ enabled: true })
    expect(status.headers['cache-control']).toBe('no-store')
    for (const p of ['/api/auth/oidc/config', '/api/sites']) expect((await get(p)).status, p).toBe(401)
    expect((await srv.request({ method: 'POST', path: '/api/auth/oidc/check' })).status).toBe(401)
    // Traversal/encoded tricks cannot borrow a public path (raw path goes over the wire untouched).
    for (const p of ['/api/auth/oidc/start/../config', '/api/auth/oidc/status/..%2Fconfig', '/api/auth/oidc/%63onfig', '/api/p/../sites']) {
      expect((await get(p)).status, p).toBe(401)
    }
  })

  it('start: 302 + hardened binding cookie on the wire (HttpOnly, SameSite=Lax, Path, Max-Age, no Secure on http)', async () => {
    await configure()
    const jar = new CookieJar()
    const r = await start(jar)
    expect(r.status).toBe(302)
    expect(r.headers['cache-control']).toBe('no-store')
    const line = findCookie(r, BIND)!
    expect(line).toMatch(/^ezswm_oidc_bind=[A-Za-z0-9_-]{43};/)
    const a = attrsOf(line)
    expect(a).toEqual(expect.arrayContaining(['httponly', 'samesite=lax', 'path=/api/auth/oidc', 'max-age=86400']))
    expect(a).not.toContain('secure')
    const auth = new URL(r.location!)
    expect(auth.origin).toBe(idp.issuer)
    // Origin comes from the real Host header; X-Forwarded-* is ignored.
    expect(auth.searchParams.get('redirect_uri')).toBe(`${srv.origin}${CB}`)
  })

  it('ignores a spoofed X-Forwarded-Host; PUBLIC_BASE_URL (https) makes BOTH cookies Secure over plain HTTP', async () => {
    await configure()
    const spoof = { 'x-forwarded-host': 'evil.example', forwarded: 'host=evil.example;proto=https' }
    const jar = new CookieJar()
    const r = await start(jar, '', spoof)
    expect(new URL(r.location!).searchParams.get('redirect_uri')).toBe(`${srv.origin}${CB}`)
    expect(attrsOf(findCookie(r, BIND)!)).not.toContain('secure')

    setOidcRuntime({ publicBaseUrl: 'https://sso.example.com' })
    const jar2 = new CookieJar()
    const s = await start(jar2, '', { ...spoof, 'x-forwarded-proto': 'http' })
    expect(new URL(s.location!).searchParams.get('redirect_uri')).toBe(`https://sso.example.com${CB}`)
    expect(attrsOf(findCookie(s, BIND)!)).toContain('secure')

    const done = await get(callbackPath(s.location!, admin), jar2)
    expect(done.status).toBe(302)
    const session = findCookie(done, 'ezswm_token')!
    expect(attrsOf(session)).toEqual(expect.arrayContaining(['httponly', 'samesite=lax', 'path=/', 'secure', 'max-age=604800']))
  })

  // Without PUBLIC_BASE_URL the fallback origin is transport-derived: a client-supplied
  // X-Forwarded-Proto must not flip the callback scheme (nor the cookies' Secure flag).
  it('X-Forwarded-Proto does not influence the fallback origin', async () => {
    await configure()
    const r = await start(new CookieJar(), '', { 'x-forwarded-proto': 'https' })
    expect(new URL(r.location!).searchParams.get('redirect_uri')).toBe(`${srv.origin}${CB}`)
  })

  it('multi-tab: shared binding cookie is not re-issued, completing one tab keeps binding + the other txn (wire level)', async () => {
    await configure()
    const jar = new CookieJar()
    const tab1 = await start(jar)
    const bind = jar.get(BIND)!
    const tab2 = await start(jar)
    expect(findCookie(tab2, BIND)).toBeUndefined()
    expect(await oidcLoginTxnRepository.countPending()).toBe(2)

    const done1 = await get(callbackPath(tab1.location!, admin), jar)
    expect(done1.status).toBe(302)
    expect(done1.location).toBe('/')
    expect(findCookie(done1, 'ezswm_token')).toBeTruthy()
    // The binding cookie is neither re-set nor deleted by the callback.
    expect(findCookie(done1, BIND)).toBeUndefined()
    jar.apply(done1.setCookies)
    expect(jar.get(BIND)).toBe(bind)
    expect(await oidcLoginTxnRepository.countPending()).toBe(1)

    const done2 = await get(callbackPath(tab2.location!, admin), jar)
    expect(done2.location).toBe('/')
    expect(findCookie(done2, 'ezswm_token')).toBeTruthy()
    expect(await prisma.user.count()).toBe(1)

    // The freshly issued session really authenticates over HTTP.
    const sites = await get('/api/sites', jar)
    expect(sites.status).toBe(200)
  })

  it('replay of a consumed callback → safe login error, no session cookie', async () => {
    await configure()
    const jar = new CookieJar()
    const s = await start(jar)
    const path = callbackPath(s.location!, admin)
    expect(findCookie(await get(path, jar), 'ezswm_token')).toBeTruthy()
    const replay = await get(path, jar)
    expect(replay.status).toBe(302)
    expect(replay.location).toBe('/login?oidc_error=oidc_transaction_invalid')
    expect(findCookie(replay, 'ezswm_token')).toBeUndefined()
  })

  it('callback without the binding cookie (attacker browser) fails and does not burn the victim txn', async () => {
    await configure()
    const victim = new CookieJar()
    const s = await start(victim)
    const path = callbackPath(s.location!, admin)
    const attacker = await get(path)
    expect(attacker.location).toBe('/login?oidc_error=oidc_transaction_invalid')
    expect(findCookie(attacker, 'ezswm_token')).toBeUndefined()
    expect(findCookie(await get(path, victim), 'ezswm_token')).toBeTruthy()
  })

  it('raw query extraction: fully percent-encoded parameter names/values are decoded correctly', async () => {
    await configure()
    const jar = new CookieJar()
    const s = await start(jar)
    const done = await get(callbackPath(s.location!, admin, true), jar)
    expect(done.location).toBe('/')
    expect(findCookie(done, 'ezswm_token')).toBeTruthy()
  })

  it('duplicated protocol parameters (also via encoded names / mixed order) are rejected at the HTTP level', async () => {
    await configure()
    const jar = new CookieJar()
    const s = await start(jar)
    const good = callbackPath(s.location!, admin)
    const code = new URLSearchParams(good.split('?')[1]).get('code')!
    const state = new URLSearchParams(good.split('?')[1]).get('state')!
    const cases = [
      `${CB}?code=${code}&code=other&state=${state}`,
      `${CB}?code=${code}&${pctAll('code')}=other&state=${state}`,
      `${CB}?code=${code}&state=${state}&state=${state}`,
      `${CB}?error=a&error=b`,
      `${CB}?code=${code}&state=${state}&iss=a&iss=b`
    ]
    for (const p of cases) {
      const r = await get(p, jar)
      expect(r.location, p).toBe('/login?oidc_error=oidc_invalid_request')
      expect(findCookie(r, 'ezswm_token')).toBeUndefined()
    }
    // Rejection happened before the txn was consumed: the clean request still works.
    expect(findCookie(await get(good, jar), 'ezswm_token')).toBeTruthy()
  })

  it('return_to travels through the raw query; open redirects collapse to /', async () => {
    await configure()
    const jar = new CookieJar()
    const cases: Array<[string, string]> = [
      ['%2Fsites%2Fhome%3Ftab%3D1', '/sites/home?tab=1'],
      ['%2F%2Fevil.example', '/'],
      ['https%3A%2F%2Fevil.example', '/'],
      ['%2F%5Cevil.example', '/'],
      ['%2Fapi%2Fusers', '/'],
      ['%2Flogin', '/'],
      ['%2Fx%0D%0ASet-Cookie%3A%20a%3Db', '/']
    ]
    for (const [raw, expected] of cases) {
      const s = await start(jar, `?return_to=${raw}`)
      expect(s.status, raw).toBe(302)
      const done = await get(callbackPath(s.location!, admin), jar)
      expect(done.location, raw).toBe(expected)
      expect(done.headers['set-cookie']?.join(';') ?? '').not.toContain('a=b')
    }
  })

  it('unusable SSO: start redirects to /login with a safe code (wire level); 429 passes through', async () => {
    const off = await get('/api/auth/oidc/start')
    expect(off.location).toBe('/login?oidc_error=oidc_not_configured')
    await configure()
    const jar = new CookieJar()
    await start(jar)
    let last: HttpResult | undefined
    for (let i = 0; i < 12; i++) last = await start(jar)
    expect(last!.status).toBe(429)
  })

  describe('public clients without secret/key are legitimate', () => {
    it('login works end-to-end with NO secret and NO encryption key configured', async () => {
      setOidcRuntime({ oidcEncryptionKey: '' })
      idp.reset({ authMethods: ['none'] })
      await configure({}, false)
      expect((await get('/api/auth/oidc/status')).json()).toEqual({ enabled: true })
      const jar = new CookieJar()
      const s = await start(jar)
      expect(s.status).toBe(302)
      expect(s.location!.startsWith(idp.issuer)).toBe(true)
      const done = await get(callbackPath(s.location!, admin), jar)
      expect(done.location).toBe('/')
      expect(findCookie(done, 'ezswm_token')).toBeTruthy()
      jar.apply(done.setCookies)
      expect(idp.tokenRequests.at(-1)!.authorization).toBe('')
      expect(idp.tokenRequests.at(-1)!.params.get('client_secret')).toBeNull()
      // …and the session is valid even though the key is absent (no secret → no key needed).
      expect((await get('/api/sites', jar)).status).toBe(200)
    })

    it('admin PUT enables a public client without a key; storing a secret without a key is refused', async () => {
      setOidcRuntime({ oidcEncryptionKey: '' })
      const root = await seedLocalUser(prisma, { username: 'root', role: 'admin' })
      const headers = { cookie: `ezswm_token=${asCookie(tokenFor(root)).ezswm_token}` }
      const ok = await srv.request({ method: 'PUT', path: '/api/auth/oidc/config', headers, body: { issuer: idp.issuer, client_id: 'pub', allow_http_issuer: true, enabled: true } })
      expect(ok.status, ok.body).toBe(200)
      expect(ok.json()).toMatchObject({ enabled: true, client_secret_configured: false, encryption_key_ready: false })
      expect((await get('/api/auth/oidc/status')).json()).toEqual({ enabled: true })

      const bad = await srv.request({ method: 'PUT', path: '/api/auth/oidc/config', headers, body: { client_secret: 'plain-secret-xyz' } })
      expect(bad.status).toBe(400)
      expect(bad.body).not.toContain('plain-secret-xyz')
      expect((await prisma.oidcConfig.findFirst())?.client_secret_ciphertext ?? null).toBeNull()
    })
  })
})
