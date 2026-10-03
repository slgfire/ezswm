import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { ProviderMockIdp, type IdpScenario, type MockIdpOptions } from './helpers/mockIdp'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { checkOidcDiscovery, clearOidcClientCache } from '../server/utils/oidc/client'
import { beginOidcLogin, completeOidcLogin, generateBindingValue, type OidcRuntimeSettings } from '../server/utils/oidc/session'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const settings: OidcRuntimeSettings = { jwtSecret: 'jwt-secret-compat', oidcEncryptionKey: KEY_B64, publicBaseUrl: '' }
const origin = 'http://ezswm.test'

describe('OIDC provider compatibility (real HTTP mock IdP, RS256-verified ID tokens)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  const idp = new ProviderMockIdp()

  beforeAll(async () => {
    const ctx = await createTestPrisma()
    prisma = ctx.prisma
    resetDb = ctx.resetDb
    cleanup = ctx.cleanup
    globalThis.__prismaTestClient = prisma
    await idp.start()
  })

  afterAll(async () => {
    idp.stop()
    globalThis.__prismaTestClient = undefined
    await cleanup()
  })

  beforeEach(async () => {
    await resetDb()
    await prisma.oidcLoginTxn.deleteMany()
    await prisma.oidcConfig.deleteMany()
    clearOidcClientCache()
    idp.reset()
  })

  async function configure(over: Record<string, unknown> = {}, withSecret = true) {
    const key = parseOidcEncryptionKey(KEY_B64)
    return oidcConfigRepository.update({
      enabled: true,
      issuer: idp.issuer,
      client_id: idp.clientId,
      client_secret_ciphertext: withSecret ? encryptOidcSecret(idp.clientSecret, key) : null,
      admin_groups: ['admins'],
      viewer_groups: ['viewers'],
      allow_http_issuer: true,
      ...over
    })
  }

  async function login(scenario: IdpScenario) {
    const binding = generateBindingValue()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin, existingBinding: binding })
    if (!begin.ok) return { begin, result: null }
    const query = idp.prepare(begin.redirectUrl, scenario)
    const result = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: binding })
    return { begin, result }
  }

  const reconfigureIdp = (o: MockIdpOptions) => idp.reset(o)

  describe('UserInfo group fallback', () => {
    it('ID token without groups: UserInfo (Bearer access token, verified sub) supplies the groups', async () => {
      await configure()
      const { result } = await login({ userInfo: { groups: ['admins'], name: 'From UserInfo' } })
      expect(result?.ok).toBe(true)
      if (!result?.ok) return
      expect(result.user).toMatchObject({ role: 'admin', oidc_subject: 'user-1', display_name: 'From UserInfo' })
      expect(idp.hits).toContain('GET /userinfo')
      expect(idp.userInfoAuth[0]).toMatch(/^Bearer at-c/)
    })

    it('ID token groups win: UserInfo is not even called', async () => {
      await configure()
      const { result } = await login({ idClaims: { groups: ['viewers'] }, userInfo: { groups: ['admins'] } })
      expect(result?.ok && result.user.role).toBe('viewer')
      expect(idp.hits).not.toContain('GET /userinfo')
    })

    it('UserInfo with a mismatched sub is denied and provisions no user', async () => {
      await configure({ allow_unmatched_viewer: true })
      const { result } = await login({ userInfoSub: 'someone-else', userInfo: { groups: ['admins'] } })
      expect(result?.ok).toBe(false)
      expect(await prisma.user.count()).toBe(0)
    })

    it('UserInfo server error / malformed groups deny even with the unmatched-viewer toggle', async () => {
      await configure({ allow_unmatched_viewer: true })
      const err = await login({ userInfoStatus: 500 })
      expect(err.result?.ok).toBe(false)
      const bad = await login({ userInfo: { groups: 'admins' } })
      expect(bad.result).toMatchObject({ ok: false, code: 'oidc_access_denied', detail: 'groups_malformed' })
      expect(await prisma.user.count()).toBe(0)
    })

    it('no userinfo endpoint: missing groups denied by default, viewer only with the explicit toggle', async () => {
      reconfigureIdp({ userinfo: false })
      await configure()
      const denied = await login({})
      expect(denied.result).toMatchObject({ ok: false, code: 'oidc_access_denied', detail: 'groups_missing' })
      expect(await prisma.user.count()).toBe(0)

      await oidcConfigRepository.update({ allow_unmatched_viewer: true })
      const allowed = await login({})
      expect(allowed.result?.ok).toBe(true)
      if (allowed.result?.ok) expect(allowed.result.user.role).toBe('viewer')
      expect(idp.hits).not.toContain('GET /userinfo')
    })
  })

  describe('HTTP issuer policy', () => {
    it('rejects an http issuer by default (no discovery request is made)', async () => {
      await configure({ allow_http_issuer: false })
      const begin = await beginOidcLogin({ settings, requestOrigin: origin })
      expect(begin).toMatchObject({ ok: false })
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check.ok).toBe(false)
      expect(idp.hits).toEqual([])
    })

    it('accepts the same issuer with explicit opt-in', async () => {
      await configure({ allow_http_issuer: true })
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check).toMatchObject({ ok: true, issuer: idp.issuer, token_endpoint_auth_method: 'client_secret_basic', id_token_alg: 'RS256' })
      expect(check.endpoints).toEqual({ authorization: true, token: true, jwks: true, userinfo: true })
    })
  })

  describe('token endpoint client authentication (asserted at the real token endpoint)', () => {
    it('Basic when advertised', async () => {
      await configure()
      const { result } = await login({ idClaims: { groups: ['admins'] } })
      expect(result?.ok).toBe(true)
      const req = idp.tokenRequests.at(-1)!
      // RFC 6749 §2.3.1: credentials are form-urlencoded before base64.
      const [id, secret] = Buffer.from(req.authorization.replace(/^Basic /, ''), 'base64').toString().split(':').map(decodeURIComponent)
      expect([id, secret]).toEqual([idp.clientId, idp.clientSecret])
      expect(req.params.get('client_secret')).toBeNull()
      expect(req.params.get('grant_type')).toBe('authorization_code')
      expect(req.params.get('code_verifier')).toBeTruthy()
    })

    it('Basic when the provider advertises nothing (spec default)', async () => {
      reconfigureIdp({ authMethods: null })
      await configure()
      const { result } = await login({ idClaims: { groups: ['admins'] } })
      expect(result?.ok).toBe(true)
      expect(idp.tokenRequests.at(-1)!.authorization.startsWith('Basic ')).toBe(true)
    })

    it('Post when only client_secret_post is advertised', async () => {
      reconfigureIdp({ authMethods: ['client_secret_post'] })
      await configure()
      const { result } = await login({ idClaims: { groups: ['admins'] } })
      expect(result?.ok).toBe(true)
      const req = idp.tokenRequests.at(-1)!
      expect(req.authorization).toBe('')
      expect(req.params.get('client_id')).toBe(idp.clientId)
      expect(req.params.get('client_secret')).toBe(idp.clientSecret)
    })

    it('None for a public client: no secret sent anywhere, PKCE still used', async () => {
      reconfigureIdp({ authMethods: ['none'] })
      await configure({}, false)
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), null)
      expect(check).toMatchObject({ ok: true, token_endpoint_auth_method: 'none' })
      const { result } = await login({ idClaims: { groups: ['admins'] } })
      expect(result?.ok).toBe(true)
      const req = idp.tokenRequests.at(-1)!
      expect(req.authorization).toBe('')
      expect(req.params.get('client_id')).toBe(idp.clientId)
      expect(req.params.get('client_secret')).toBeNull()
      expect(req.params.get('code_verifier')).toBeTruthy()
    })

    it('fails closed when only unsupported client auth is advertised and a secret is set', async () => {
      reconfigureIdp({ authMethods: ['private_key_jwt'] })
      await configure()
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check).toMatchObject({ ok: false, code: 'unsupported_client_auth' })
      const { begin, result } = await login({ idClaims: { groups: ['admins'] } })
      expect(begin.ok).toBe(false)
      expect(result).toBeNull()
      expect(idp.tokenRequests).toHaveLength(0)
    })
  })

  describe('cross-host endpoints and redirects', () => {
    it('follows advertised authorization/token/JWKS/UserInfo endpoints on another hostname', async () => {
      reconfigureIdp({ endpointHost: 'localhost' })
      await configure()
      const begin = await beginOidcLogin({ settings, requestOrigin: origin })
      if (!begin.ok) throw new Error(`begin failed: ${begin.code}`)
      expect(new URL(begin.redirectUrl).host).toBe(`localhost:${idp.port}`)
      const { result } = await login({ userInfo: { groups: ['admins'] } })
      expect(result?.ok).toBe(true)
      expect(idp.hits).toEqual(expect.arrayContaining(['POST /token', 'GET /jwks', 'GET /userinfo']))
    })

    it('never follows a redirect from the JWKS endpoint (fails closed, no user)', async () => {
      reconfigureIdp({ jwksRedirect: true })
      await configure()
      const { result } = await login({ idClaims: { groups: ['admins'] } })
      expect(result?.ok).toBe(false)
      expect(idp.hits).not.toContain('GET /elsewhere')
      expect(await prisma.user.count()).toBe(0)
    })

    it('never follows a redirect from the UserInfo or token endpoint', async () => {
      reconfigureIdp({ userinfoRedirect: true })
      await configure()
      const a = await login({ userInfo: { groups: ['admins'] } })
      expect(a.result?.ok).toBe(false)

      reconfigureIdp({ tokenRedirect: true })
      clearOidcClientCache()
      const b = await login({ idClaims: { groups: ['admins'] } })
      expect(b.result?.ok).toBe(false)
      expect(idp.hits).not.toContain('GET /elsewhere')
      expect(await prisma.user.count()).toBe(0)
    })
  })
})
