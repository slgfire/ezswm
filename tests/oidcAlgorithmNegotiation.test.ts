import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import { ProviderMockIdp, type IdpScenario, type MockIdpOptions } from './helpers/mockIdp'
import { encryptOidcSecret, parseOidcEncryptionKey } from '../server/utils/oidc/crypto'
import { checkOidcDiscovery, classifyOidcError, clearOidcClientCache, OidcClientError, selectIdTokenAlg } from '../server/utils/oidc/client'
import { beginOidcLogin, completeOidcLogin, generateBindingValue, type OidcRuntimeSettings } from '../server/utils/oidc/session'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'

const code = { code: 'unsupported_id_token_alg' }
const pick = selectIdTokenAlg

describe('selectIdTokenAlg (unit)', () => {
  it('only an absent advertisement falls back to RS256', () => {
    expect(pick(undefined)).toBe('RS256')
  })

  it('prefers RS256, then the existing asymmetric order', () => {
    expect(pick(['ES256', 'RS256'])).toBe('RS256')
    expect(pick(['RS256', 'HS256'])).toBe('RS256')
    expect(pick(['HS256', 'ES256'])).toBe('ES256')
    expect(pick(['PS256'])).toBe('PS256')
  })

  it('unknown non-empty strings are tolerated next to a supported algorithm', () => {
    expect(pick(['x-custom', 'RS256'])).toBe('RS256')
    expect(pick(['x-custom', 'ES256'])).toBe('ES256')
  })

  it.each([
    ['empty array', []],
    ['HMAC only', ['HS256']],
    ['none only', ['none']],
    ['HS256 + none', ['HS256', 'none']],
    ['null', null],
    ['object', {}],
    ['non-array string', 'RS256'],
    ['RS256 plus empty string', ['RS256', '']],
    ['RS256 plus number', ['RS256', 42]],
    ['RS256 plus null', ['RS256', null]],
    ['RS256 plus boolean', ['RS256', true]],
    ['lowercase only (case-sensitive)', ['rs256']],
    ['unknown only', ['x-custom']],
    ['padded (no trimming)', [' RS256']]
  ])('rejects %s', (_label, value) => {
    expect(() => pick(value)).toThrow(expect.objectContaining(code))
  })
})

const KEY_B64 = randomBytes(32).toString('base64')
const settings: OidcRuntimeSettings = { jwtSecret: 'jwt-secret-alg', oidcEncryptionKey: KEY_B64, publicBaseUrl: '' }
const origin = 'http://ezswm.test'

describe('OIDC ID token algorithm negotiation (real HTTP mock IdP, real signatures)', () => {
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

  async function configure() {
    const key = parseOidcEncryptionKey(KEY_B64)
    return oidcConfigRepository.update({
      enabled: true,
      issuer: idp.issuer,
      client_id: idp.clientId,
      client_secret_ciphertext: encryptOidcSecret(idp.clientSecret, key),
      admin_groups: ['admins'],
      viewer_groups: ['viewers'],
      allow_http_issuer: true
    })
  }

  async function login(scenario: IdpScenario = { idClaims: { groups: ['admins'] } }, wrongVerifier = false) {
    const binding = generateBindingValue()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin, existingBinding: binding })
    if (!begin.ok) return { begin, result: null }
    const query = idp.prepare(begin.redirectUrl, scenario)
    if (wrongVerifier) {
      // Re-register the code with a challenge of a different verifier than the one the client holds.
      const meta = idp.pending.get(query.get('code')!)!
      meta.challenge = 'x'.repeat(43)
    }
    const result = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: binding })
    return { begin, result }
  }

  async function expectNoSideEffects() {
    expect(await prisma.user.count()).toBe(0)
  }

  describe('real PS256 (RSASSA-PSS) ID tokens', () => {
    it('full code + PKCE + state + nonce grant provisions the validated issuer/sub with the mapped role', async () => {
      idp.reset({ advertisedIdTokenAlgorithms: ['PS256'], signingAlg: 'PS256' })
      await configure()
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check).toMatchObject({ ok: true, id_token_alg: 'PS256' })

      const { result } = await login()
      expect(result?.ok).toBe(true)
      if (!result?.ok) return
      expect(result.user).toMatchObject({ role: 'admin', oidc_subject: 'user-1' })
      const stored = await prisma.user.findMany()
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({ role: 'admin', oidc_subject: 'user-1', oidc_issuer: idp.issuer })
      expect(idp.tokenRequests).toHaveLength(1)
    })

    it('a PS256 token signed by an unpublished (rogue) key is denied and provisions nothing', async () => {
      idp.reset({ advertisedIdTokenAlgorithms: ['PS256'], signingAlg: 'PS256', rogueSigningKey: true })
      await configure()
      const { begin, result } = await login()
      expect(begin.ok).toBe(true)
      expect(idp.tokenRequests).toHaveLength(1)
      expect(result).toMatchObject({ ok: false, code: 'oidc_token_invalid' })
      await expectNoSideEffects()
    })

    it('a PS256 token with a tampered payload is denied and provisions nothing', async () => {
      idp.reset({ advertisedIdTokenAlgorithms: ['PS256'], signingAlg: 'PS256', tamperPayload: true })
      await configure()
      const { begin, result } = await login()
      expect(begin.ok).toBe(true)
      expect(idp.tokenRequests).toHaveLength(1)
      expect(result).toMatchObject({ ok: false, code: 'oidc_token_invalid' })
      await expectNoSideEffects()
    })

    it('a wrong PKCE verifier with valid state/nonce is rejected upstream and provisions nothing', async () => {
      idp.reset({ advertisedIdTokenAlgorithms: ['PS256'], signingAlg: 'PS256' })
      await configure()
      const { result } = await login(undefined, true)
      expect(result?.ok).toBe(false)
      expect(idp.tokenRequests).toHaveLength(1)
      await expectNoSideEffects()
    })
  })

  describe('missing advertisement', () => {
    it('falls back to RS256 and a real RS256 login succeeds', async () => {
      idp.reset({ advertisedIdTokenAlgorithms: null })
      await configure()
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check).toMatchObject({ ok: true, id_token_alg: 'RS256' })
      const { result } = await login()
      expect(result?.ok && result.user.role).toBe('admin')
    })
  })

  describe('unsupported advertisements fail before any token request', () => {
    const cases: Array<[string, MockIdpOptions]> = [
      ['HS256 only', { advertisedIdTokenAlgorithms: ['HS256'] }],
      ['none only', { advertisedIdTokenAlgorithms: ['none'] }],
      ['unknown only', { advertisedIdTokenAlgorithms: ['x-custom'] }]
    ]
    it.each(cases)('%s', async (_label, opts) => {
      idp.reset(opts)
      await configure()
      const txnBefore = await prisma.oidcLoginTxn.count()

      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check).toEqual({ ok: false, code: 'unsupported_id_token_alg' })

      const begin = await beginOidcLogin({ settings, requestOrigin: origin })
      expect(begin).toEqual({ ok: false, code: 'oidc_unavailable' })
      expect(await prisma.oidcLoginTxn.count()).toBe(txnBefore)
      expect(idp.tokenRequests).toHaveLength(0)
      await expectNoSideEffects()
    })

    it('classifyOidcError collapses the code to the public oidc_unavailable', () => {
      expect(classifyOidcError(new OidcClientError('unsupported_id_token_alg'))).toBe('oidc_unavailable')
    })
  })

  describe('discovery issuer validation happens before any token exchange', () => {
    it.each([
      ['missing', null],
      ['mismatched', 'http://127.0.0.1:1/other']
    ] as const)('%s metadata issuer is rejected', async (_label, metadataIssuer) => {
      idp.reset({ metadataIssuer })
      await configure()
      const begin = await beginOidcLogin({ settings, requestOrigin: origin })
      expect(begin.ok).toBe(false)
      const check = await checkOidcDiscovery(await oidcConfigRepository.get(), idp.clientSecret)
      expect(check.ok).toBe(false)
      expect(idp.tokenRequests).toHaveLength(0)
      expect(await prisma.oidcLoginTxn.count()).toBe(0)
      await expectNoSideEffects()
    })
  })
})
