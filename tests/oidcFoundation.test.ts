import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createHash, generateKeyPairSync, randomBytes, sign as cryptoSign, type KeyObject } from 'node:crypto'

import { createTestPrisma } from './testHelpers'
import {
  decryptOidcSecret,
  encryptOidcSecret,
  getOidcKeyState,
  parseOidcEncryptionKey,
  OidcCryptoError
} from '../server/utils/oidc/crypto'
import {
  decideOidcAccess,
  deriveOidcUsername,
  extractGroups,
  mergeObservedGroups,
  needsUserInfoForGroups,
  resolveGroups,
  sanitizeObservedGroups
} from '../server/utils/oidc/claims'
import {
  clearOidcClientCache,
  parsePublicBaseUrl,
  resolveOidcCallbackUrl,
  selectIdTokenAlg,
  selectTokenAuthMethod,
  validateIssuerUrl,
  validateOidcUrl
} from '../server/utils/oidc/client'
import {
  beginOidcLogin,
  buildOidcConfigDto,
  buildOidcSessionClaims,
  completeOidcLogin,
  generateBindingValue,
  hashBindingValue,
  isOidcEffectivelyEnabled,
  isOidcSessionCurrent,
  type OidcRuntimeSettings
} from '../server/utils/oidc/session'
import { oidcConfigUpdateSchema as oidcConfigSchemaForTest, sanitizeReturnTo } from '../server/validators/oidcSchemas'
import { oidcConfigRepository } from '../server/repositories/oidcConfigRepository'
import { oidcLoginTxnRepository, OIDC_TXN_MAX_PER_BINDING } from '../server/repositories/oidcLoginTxnRepository'
import { userRepository } from '../server/repositories/userRepository'

const KEY_B64 = randomBytes(32).toString('base64')
const KEY_HEX = randomBytes(32).toString('hex')

describe('oidc crypto', () => {
  it('accepts base64 and hex 32-byte keys and rejects bad ones', () => {
    expect(parseOidcEncryptionKey(KEY_B64).length).toBe(32)
    expect(parseOidcEncryptionKey(KEY_HEX).length).toBe(32)
    expect(() => parseOidcEncryptionKey('')).toThrow(OidcCryptoError)
    expect(() => parseOidcEncryptionKey('short')).toThrow(OidcCryptoError)
    expect(() => parseOidcEncryptionKey(randomBytes(16).toString('base64'))).toThrow(OidcCryptoError)
  })

  it('rejects a key equal to JWT_SECRET (no fallback)', () => {
    expect(() => parseOidcEncryptionKey(KEY_B64, KEY_B64)).toThrow(/key_equals_jwt_secret/)
    expect(getOidcKeyState('', 'jwt').ready).toBe(false)
  })

  it('rejects the same 32 bytes as JWT_SECRET across hex/base64 encodings (both orientations)', () => {
    const raw = randomBytes(32)
    const b64 = raw.toString('base64')
    const hex = raw.toString('hex')
    expect(() => parseOidcEncryptionKey(b64, hex)).toThrow(/key_equals_jwt_secret/)
    expect(() => parseOidcEncryptionKey(hex, b64)).toThrow(/key_equals_jwt_secret/)
    expect(() => parseOidcEncryptionKey(hex, hex)).toThrow(/key_equals_jwt_secret/)
    expect(() => parseOidcEncryptionKey(b64, ` ${b64} `)).toThrow(/key_equals_jwt_secret/)
  })

  it('permits distinct bytes and non-encoding JWT secrets', () => {
    const a = randomBytes(32)
    const b = randomBytes(32)
    expect(parseOidcEncryptionKey(a.toString('base64'), b.toString('hex')).equals(a)).toBe(true)
    expect(parseOidcEncryptionKey(a.toString('hex'), b.toString('base64')).equals(a)).toBe(true)
    expect(parseOidcEncryptionKey(a.toString('base64'), 'an-ordinary-jwt-secret-value').equals(a)).toBe(true)
    expect(parseOidcEncryptionKey(a.toString('base64'), '').equals(a)).toBe(true)
  })

  it('round-trips, uses random IVs and a versioned format', () => {
    const key = parseOidcEncryptionKey(KEY_B64)
    const a = encryptOidcSecret('s3cret', key)
    const b = encryptOidcSecret('s3cret', key)
    expect(a).not.toBe(b)
    expect(a.startsWith('v1.')).toBe(true)
    expect(a.split('.')).toHaveLength(4)
    expect(a).not.toContain('s3cret')
    expect(decryptOidcSecret(a, key)).toBe('s3cret')
  })

  it('fails on tampering, wrong key and malformed payloads', () => {
    const key = parseOidcEncryptionKey(KEY_B64)
    const other = parseOidcEncryptionKey(KEY_HEX)
    const enc = encryptOidcSecret('s3cret', key)
    const parts = enc.split('.')
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1)
    expect(() => decryptOidcSecret(`${parts[0]}.${parts[1]}.${parts[2]}.${flip(parts[3]!)}`, key)).toThrow(/decrypt_failed/)
    expect(() => decryptOidcSecret(`${parts[0]}.${parts[1]}.${flip(parts[2]!)}.${parts[3]}`, key)).toThrow(/decrypt_failed/)
    expect(() => decryptOidcSecret(`${parts[0]}.${flip(parts[1]!)}.${parts[2]}.${parts[3]}`, key)).toThrow(/decrypt_failed/)
    expect(() => decryptOidcSecret(enc, other)).toThrow(/decrypt_failed/)
    expect(() => decryptOidcSecret('v2.a.b.c', key)).toThrow(/payload_invalid/)
    expect(() => decryptOidcSecret('garbage', key)).toThrow(/payload_invalid/)
  })
})

describe('oidc claims mapping', () => {
  const rules = { adminGroups: ['admins'], viewerGroups: ['viewers'], allowUnmatchedViewer: false }

  it('extracts groups from plain, dotted and namespaced claims', () => {
    expect(extractGroups({ groups: ['a', 'b', 'a'] }, 'groups')).toEqual({ status: 'ok', groups: ['a', 'b'] })
    expect(extractGroups({ realm_access: { roles: ['r1'] } }, 'realm_access.roles')).toEqual({ status: 'ok', groups: ['r1'] })
    expect(extractGroups({ 'https://x.example/groups': ['g'] }, 'https://x.example/groups')).toEqual({ status: 'ok', groups: ['g'] })
  })

  it('distinguishes missing from malformed and never walks the prototype', () => {
    expect(extractGroups({}, 'groups')).toEqual({ status: 'missing' })
    expect(extractGroups({ groups: 'admins' }, 'groups').status).toBe('malformed')
    expect(extractGroups({ groups: ['a', 1] }, 'groups').status).toBe('malformed')
    expect(extractGroups({ groups: [''] }, 'groups').status).toBe('malformed')
    expect(extractGroups({ groups: Array.from({ length: 501 }, (_, i) => `g${i}`) }, 'groups').status).toBe('malformed')
    expect(extractGroups({}, '__proto__.x').status).toBe('malformed')
    expect(extractGroups({}, 'constructor.name').status).toBe('malformed')
    expect(extractGroups({}, 'toString')).toEqual({ status: 'missing' })
  })

  it('detects overage but ignores unrelated distributed claims', () => {
    expect(extractGroups({ hasgroups: true }, 'groups').status).toBe('overage')
    expect(extractGroups({ _claim_names: { groups: 'src1' } }, 'groups').status).toBe('overage')
    expect(extractGroups({ _claim_names: { roles: 'src1' } }, 'roles_x')).toEqual({ status: 'missing' })
    expect(extractGroups({ _claim_names: { grp: 's' } }, 'grp').status).toBe('overage')
    expect(extractGroups({ _claim_names: { picture: 'src1' }, groups: ['x'] }, 'groups')).toEqual({ status: 'ok', groups: ['x'] })
  })

  it('applies admin-wins / viewer / unmatched policy', () => {
    expect(decideOidcAccess({ status: 'ok', groups: ['viewers', 'admins'] }, rules)).toMatchObject({ ok: true, role: 'admin' })
    expect(decideOidcAccess({ status: 'ok', groups: ['viewers'] }, rules)).toMatchObject({ ok: true, role: 'viewer' })
    expect(decideOidcAccess({ status: 'ok', groups: ['other'] }, rules)).toEqual({ ok: false, reason: 'no_matching_group' })
    expect(decideOidcAccess({ status: 'ok', groups: ['other'] }, { ...rules, allowUnmatchedViewer: true })).toMatchObject({ ok: true, role: 'viewer' })
    expect(decideOidcAccess({ status: 'missing' }, rules)).toEqual({ ok: false, reason: 'groups_missing' })
    expect(decideOidcAccess({ status: 'missing' }, { ...rules, allowUnmatchedViewer: true })).toMatchObject({ ok: true, role: 'viewer' })
  })

  it('never allows malformed/overage even with the unmatched-viewer fallback', () => {
    const open = { ...rules, allowUnmatchedViewer: true }
    expect(decideOidcAccess({ status: 'malformed', reason: 'x' }, open)).toEqual({ ok: false, reason: 'groups_malformed' })
    expect(decideOidcAccess({ status: 'overage' }, open)).toEqual({ ok: false, reason: 'groups_overage' })
  })

  it('uses UserInfo only when the ID token has no groups at all', () => {
    expect(needsUserInfoForGroups({}, 'groups')).toBe(true)
    expect(needsUserInfoForGroups({ groups: 'bad' }, 'groups')).toBe(false)
    expect(resolveGroups({}, 'groups', { groups: ['admins'] })).toEqual({ status: 'ok', groups: ['admins'] })
    expect(resolveGroups({ groups: 'bad' }, 'groups', { groups: ['admins'] }).status).toBe('malformed')
    expect(resolveGroups({ hasgroups: true }, 'groups', { groups: ['admins'] }).status).toBe('overage')
    expect(resolveGroups({}, 'groups', { groups: 'bad' }).status).toBe('malformed')
  })

  it('bounds and sanitizes observed groups', () => {
    expect(sanitizeObservedGroups(['ok', ' trim ', 'x'.repeat(129), 'bad\nline', ''])).toEqual(['ok', 'trim'])
    const many = Array.from({ length: 80 }, (_, i) => `g${i}`)
    const merged = mergeObservedGroups([], many)
    expect(merged).toHaveLength(50)
    expect(merged[49]).toBe('g79')
    expect(mergeObservedGroups(['a', 'b'], ['a'])).toEqual(['b', 'a'])
  })

  it('derives a valid deterministic username', () => {
    const u = deriveOidcUsername('https://idp', 'sub-1')
    expect(u).toMatch(/^[a-zA-Z0-9_]{3,50}$/)
    expect(u).toBe(deriveOidcUsername('https://idp', 'sub-1'))
    expect(u).not.toBe(deriveOidcUsername('https://idp', 'sub-2'))
    expect(deriveOidcUsername('https://idp', 'sub-1', 3).length).toBeLessThanOrEqual(50)
  })
})

describe('oidc validators & client policy', () => {
  it('validates config updates', () => {
    const s = oidcConfigSchemaForTest
    expect(s.safeParse({ issuer: 'https://idp.example.com', scopes: ['profile'] }).data?.scopes).toEqual(['openid', 'profile'])
    expect(s.safeParse({ issuer: 'ftp://x' }).success).toBe(false)
    expect(s.safeParse({ issuer: 'https://u:p@x' }).success).toBe(false)
    expect(s.safeParse({ issuer: 'https://x/#f' }).success).toBe(false)
    expect(s.safeParse({ issuer: 'https://x/?q=1' }).success).toBe(false)
    expect(s.safeParse({ client_secret: 'a', client_secret_clear: true }).success).toBe(false)
    expect(s.safeParse({ groups_claim: 'a b' }).success).toBe(false)
    expect(s.safeParse({ unknown: 1 }).success).toBe(false)
    expect(s.safeParse({ admin_groups: ['a', 'a', ' b '] }).data?.admin_groups).toEqual(['a', 'b'])
  })

  it('sanitizes return_to to same-origin relative paths', () => {
    expect(sanitizeReturnTo('/sites/x')).toBe('/sites/x')
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil', '/api/x', '/login', 'x', undefined, '/a\nb']) {
      expect(sanitizeReturnTo(bad)).toBe('/')
    }
  })

  it('resolves the canonical callback URL without trusting other hosts', () => {
    expect(resolveOidcCallbackUrl('https://ezswm.example.com', 'http://internal:3000')).toBe('https://ezswm.example.com/api/auth/oidc/callback')
    expect(resolveOidcCallbackUrl('', 'http://internal:3000')).toBe('http://internal:3000/api/auth/oidc/callback')
    for (const bad of ['https://u:p@x.com', 'https://x.com/app', 'https://x.com/?a=1', 'https://x.com/#f', 'ftp://x', 'nonsense']) {
      expect(parsePublicBaseUrl(bad)).toBeNull()
      expect(resolveOidcCallbackUrl(bad, 'http://req:1')).toBe('http://req:1/api/auth/oidc/callback')
    }
  })

  it('enforces HTTPS by default and allows other-host endpoints', () => {
    expect(() => validateIssuerUrl('http://idp.local', false)).toThrow()
    expect(validateIssuerUrl('http://10.0.0.5:8080/realm', true).hostname).toBe('10.0.0.5')
    expect(validateIssuerUrl('https://192.168.1.10', false).hostname).toBe('192.168.1.10')
    expect(validateOidcUrl('https://login.other-host.example/token', false).hostname).toBe('login.other-host.example')
    expect(() => validateOidcUrl('http://x/token', false)).toThrow()
    expect(() => validateOidcUrl('https://u:p@x/token', false)).toThrow()
    expect(() => validateOidcUrl('https://x/token#f', false)).toThrow()
    expect(() => validateOidcUrl('javascript:alert(1)', true)).toThrow()
  })

  it('selects client auth explicitly and ID token alg safely', () => {
    expect(selectTokenAuthMethod(undefined, true)).toBe('client_secret_basic')
    expect(selectTokenAuthMethod(['client_secret_post', 'client_secret_basic'], true)).toBe('client_secret_basic')
    expect(selectTokenAuthMethod(['client_secret_post'], true)).toBe('client_secret_post')
    expect(() => selectTokenAuthMethod(['private_key_jwt'], true)).toThrow()
    expect(selectTokenAuthMethod(['private_key_jwt'], false)).toBe('none')
    expect(selectIdTokenAlg(undefined)).toBe('RS256')
    expect(selectIdTokenAlg(['ES256', 'RS256'])).toBe('RS256')
    expect(selectIdTokenAlg(['HS256', 'ES256'])).toBe('ES256')
    expect(() => selectIdTokenAlg(['none', 'HS256'])).toThrow(expect.objectContaining({ code: 'unsupported_id_token_alg' }))
  })
})

// ---------------------------------------------------------------------------
// Repositories + real mock IdP (real signatures; negative JWT cases)
// ---------------------------------------------------------------------------

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')

interface Scenario {
  claims?: Record<string, unknown>
  omitNonce?: boolean
  signWith?: 'good' | 'rogue'
  alg?: string
  tamperSignature?: boolean
}

class MockIdp {
  server!: Server
  issuer = ''
  clientId = 'ezswm-client'
  clientSecret = 'mock-secret'
  good = generateKeyPairSync('rsa', { modulusLength: 2048 })
  rogue = generateKeyPairSync('rsa', { modulusLength: 2048 })
  kid = 'kid-1'
  challenges = new Map<string, { challenge: string, nonce: string }>()
  scenarios = new Map<string, Scenario>()
  basicAuthSeen: string[] = []

  async start() {
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', this.issuer)
      const json = (obj: unknown, status = 200) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(obj))
      }
      if (url.pathname === '/.well-known/openid-configuration') {
        return json({
          issuer: this.issuer,
          authorization_endpoint: `${this.issuer}/authorize`,
          token_endpoint: `${this.issuer}/token`,
          jwks_uri: `${this.issuer}/jwks`,
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
          code_challenge_methods_supported: ['S256']
        })
      }
      if (url.pathname === '/jwks') {
        return json({ keys: [{ ...(this.good.publicKey.export({ format: 'jwk' }) as object), kid: this.kid, use: 'sig', alg: 'RS256' }] })
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        let body = ''
        req.on('data', c => (body += c))
        req.on('end', () => {
          const p = new URLSearchParams(body)
          this.basicAuthSeen.push(String(req.headers.authorization ?? ''))
          const code = p.get('code') ?? ''
          const meta = this.challenges.get(code)
          const verifier = p.get('code_verifier') ?? ''
          const challenge = createHash('sha256').update(verifier).digest('base64url')
          if (!meta || meta.challenge !== challenge) return json({ error: 'invalid_grant' }, 400)
          const sc = this.scenarios.get(code) ?? {}
          return json({ access_token: 'at', token_type: 'Bearer', id_token: this.makeIdToken(meta.nonce, sc), expires_in: 300 })
        })
        return
      }
      res.writeHead(404).end()
    })
    await new Promise<void>(r => this.server.listen(0, '127.0.0.1', r))
    this.issuer = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`
  }

  stop() {
    this.server.close()
  }

  makeIdToken(nonce: string, sc: Scenario): string {
    const now = Math.floor(Date.now() / 1000)
    const payload: Record<string, unknown> = {
      iss: this.issuer, aud: this.clientId, sub: 'user-1', iat: now, exp: now + 300,
      ...(sc.omitNonce ? {} : { nonce }), ...sc.claims
    }
    const alg = sc.alg ?? 'RS256'
    const header = b64u(JSON.stringify({ alg, typ: 'JWT', kid: this.kid }))
    const data = `${header}.${b64u(JSON.stringify(payload))}`
    if (alg === 'none') return `${data}.`
    const key: KeyObject = (sc.signWith === 'rogue' ? this.rogue : this.good).privateKey
    let sig = cryptoSign('sha256', Buffer.from(data), key)
    if (sc.tamperSignature) sig = Buffer.from(sig.map((x, i) => (i === 0 ? x ^ 0xff : x)))
    return `${data}.${b64u(sig)}`
  }

  /** Register an authorization request's challenge/nonce and scenario; returns code. */
  prepare(authUrl: string, scenario: Scenario = {}): { code: string, state: string } {
    const u = new URL(authUrl)
    const code = `code-${randomBytes(6).toString('hex')}`
    this.challenges.set(code, { challenge: u.searchParams.get('code_challenge')!, nonce: u.searchParams.get('nonce')! })
    this.scenarios.set(code, scenario)
    return { code, state: u.searchParams.get('state')! }
  }
}

describe('oidc repositories and login flow (mock IdP)', () => {
  let prisma: PrismaClient
  let resetDb: () => Promise<void>
  let cleanup: () => Promise<void>
  const idp = new MockIdp()
  const settings: OidcRuntimeSettings = { jwtSecret: 'jwt-secret-x', oidcEncryptionKey: KEY_B64, publicBaseUrl: '' }
  const origin = 'http://ezswm.test'

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
  })

  async function configure(over: Record<string, unknown> = {}) {
    const key = parseOidcEncryptionKey(KEY_B64)
    return oidcConfigRepository.update({
      enabled: true,
      issuer: idp.issuer,
      client_id: idp.clientId,
      client_secret_ciphertext: encryptOidcSecret(idp.clientSecret, key),
      admin_groups: ['admins'],
      viewer_groups: ['viewers'],
      allow_http_issuer: true,
      ...over
    })
  }

  async function login(scenario: Scenario, opts: { binding?: string, bindingForCallback?: string } = {}) {
    const binding = opts.binding ?? generateBindingValue()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin, existingBinding: binding })
    if (!begin.ok) throw new Error(`begin failed: ${begin.code}`)
    const { code, state } = idp.prepare(begin.redirectUrl, scenario)
    const query = new URLSearchParams({ code, state })
    const result = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: opts.bindingForCallback ?? binding })
    return { result, state, code, binding, query }
  }

  it('authorization request uses code+PKCE(S256)+state+nonce and canonical callback', async () => {
    await configure()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin })
    expect(begin.ok).toBe(true)
    if (!begin.ok) return
    expect(begin.bindingIsNew).toBe(true)
    const u = new URL(begin.redirectUrl)
    expect(u.searchParams.get('response_type')).toBe('code')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('state')).toBeTruthy()
    expect(u.searchParams.get('nonce')).toBeTruthy()
    expect(u.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/oidc/callback`)
    expect(u.searchParams.get('scope')).toBe('openid profile')
    expect(u.searchParams.get('client_secret')).toBeNull()
  })

  it('provisions an admin, syncs role authoritatively, records observed groups', async () => {
    await configure()
    const first = await login({ claims: { groups: ['admins', 'eng'], name: 'Ada' } })
    expect(first.result.ok).toBe(true)
    if (!first.result.ok) return
    expect(first.result.user).toMatchObject({ role: 'admin', auth_provider: 'oidc', password_hash: null, oidc_issuer: idp.issuer, oidc_subject: 'user-1', display_name: 'Ada' })
    expect(first.result.user.username).toMatch(/^oidc_[0-9a-f]+$/)
    expect(idp.basicAuthSeen.at(-1)?.startsWith('Basic ')).toBe(true)

    const second = await login({ claims: { groups: ['viewers'] } })
    expect(second.result.ok).toBe(true)
    if (!second.result.ok) return
    expect(second.result.user.id).toBe(first.result.user.id)
    expect(second.result.user.role).toBe('viewer')
    expect((await oidcConfigRepository.get()).observed_groups).toEqual(expect.arrayContaining(['admins', 'eng', 'viewers']))
    expect(await prisma.user.count()).toBe(1)
  })

  it('does not link to existing local users by username/email', async () => {
    await configure()
    await userRepository.create({ username: 'ada', display_name: 'Ada', password_hash: 'h', role: 'admin', language: 'en', is_setup_user: true })
    const r = await login({ claims: { groups: ['viewers'], preferred_username: 'ada', email: 'ada@example.com' } })
    expect(r.result.ok).toBe(true)
    expect(await prisma.user.count()).toBe(2)
    const local = await userRepository.getByUsername('ada')
    expect(local?.auth_provider).toBe('local')
    expect(local?.role).toBe('admin')
  })

  it('rejects a bad signature (rogue key), tampered signature, alg none, wrong nonce/aud/iss/expired', async () => {
    await configure()
    const cases: Scenario[] = [
      { signWith: 'rogue' },
      { tamperSignature: true },
      { alg: 'none' },
      { claims: { nonce: 'attacker-nonce' } },
      { omitNonce: true },
      { claims: { aud: 'other-client' } },
      { claims: { iss: 'http://evil.example' } },
      { claims: { exp: Math.floor(Date.now() / 1000) - 3600, iat: Math.floor(Date.now() / 1000) - 7200 } },
      { claims: { sub: '' } }
    ]
    for (const sc of cases) {
      const r = await login({ ...sc, claims: { groups: ['admins'], ...sc.claims } })
      expect(r.result.ok, JSON.stringify(sc)).toBe(false)
      if (!r.result.ok) expect(['oidc_token_invalid', 'oidc_provider_error'], JSON.stringify([sc, r.result])).toContain(r.result.code)
    }
    expect(await prisma.user.count()).toBe(0)
  })

  it('token-validation attacks have no identity effects (no session version bump)', async () => {
    await configure()
    const ok = await login({ claims: { groups: ['admins'] } })
    if (!ok.result.ok) throw new Error('setup login failed')
    const bad = await login({ signWith: 'rogue', claims: { groups: ['other'] } })
    expect(bad.result.ok).toBe(false)
    expect((await userRepository.getById(ok.result.user.id))?.oidc_session_version).toBe(0)
  })

  it('denies after validation and bumps session version only for existing identities', async () => {
    await configure()
    const ok = await login({ claims: { groups: ['admins'] } })
    if (!ok.result.ok) throw new Error('setup login failed')

    const denied = await login({ claims: { groups: ['nobody'] } })
    expect(denied.result).toMatchObject({ ok: false, code: 'oidc_access_denied' })
    const after = await userRepository.getById(ok.result.user.id)
    expect(after?.oidc_session_version).toBe(1)
    const cfg = await oidcConfigRepository.get()
    expect(isOidcSessionCurrent(ok.result.user, buildOidcSessionClaims(ok.result.user, cfg), cfg)).toBe(true)
    expect(isOidcSessionCurrent(after!, buildOidcSessionClaims(ok.result.user, cfg), cfg)).toBe(false)

    const unknown = await login({ claims: { sub: 'stranger', groups: ['nobody'] } })
    expect(unknown.result).toMatchObject({ ok: false, code: 'oidc_access_denied' })
    expect(await prisma.user.count()).toBe(1)
  })

  it('denies overage and malformed groups even with unmatched-viewer enabled', async () => {
    await configure({ allow_unmatched_viewer: true })
    const a = await login({ claims: { hasgroups: true } })
    expect(a.result).toMatchObject({ ok: false, code: 'oidc_access_denied', detail: 'groups_overage' })
    const b = await login({ claims: { groups: 'admins' } })
    expect(b.result).toMatchObject({ ok: false, code: 'oidc_access_denied', detail: 'groups_malformed' })
    const c = await login({ claims: { groups: ['zzz'] } })
    expect(c.result.ok).toBe(true)
    if (c.result.ok) expect(c.result.user.role).toBe('viewer')
  })

  it('is single-use: replaying a consumed state fails', async () => {
    await configure()
    const first = await login({ claims: { groups: ['admins'] } })
    expect(first.result.ok).toBe(true)
    const replay = await completeOidcLogin({ settings, requestOrigin: origin, query: first.query, bindingValue: first.binding })
    expect(replay).toMatchObject({ ok: false, code: 'oidc_transaction_invalid', detail: 'consumed' })
  })

  it('binds to the browser: wrong binding fails without burning the transaction', async () => {
    await configure()
    const binding = generateBindingValue()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin, existingBinding: binding })
    if (!begin.ok) throw new Error('begin failed')
    expect(begin.bindingIsNew).toBe(false)
    const { code, state } = idp.prepare(begin.redirectUrl, { claims: { groups: ['admins'] } })
    const query = new URLSearchParams({ code, state })
    const wrong = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: generateBindingValue() })
    expect(wrong).toMatchObject({ ok: false, code: 'oidc_transaction_invalid', detail: 'binding_mismatch' })
    const none = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: undefined })
    expect(none).toMatchObject({ ok: false, code: 'oidc_transaction_invalid' })
    const right = await completeOidcLogin({ settings, requestOrigin: origin, query, bindingValue: binding })
    expect(right.ok).toBe(true)
  })

  it('config change invalidates in-flight transactions and old sessions', async () => {
    await configure()
    const binding = generateBindingValue()
    const begin = await beginOidcLogin({ settings, requestOrigin: origin, existingBinding: binding })
    if (!begin.ok) throw new Error('begin failed')
    const { code, state } = idp.prepare(begin.redirectUrl, { claims: { groups: ['admins'] } })
    expect(await oidcLoginTxnRepository.countPending()).toBe(1)

    const before = await oidcConfigRepository.get()
    const { changed, config } = await oidcConfigRepository.update({ admin_groups: ['admins', 'ops'] })
    expect(changed).toBe(true)
    expect(config.config_revision).toBe(before.config_revision + 1)
    expect(await oidcLoginTxnRepository.countPending()).toBe(0)
    const r = await completeOidcLogin({ settings, requestOrigin: origin, query: new URLSearchParams({ code, state }), bindingValue: binding })
    expect(r).toMatchObject({ ok: false, code: 'oidc_transaction_invalid' })

    const cfgRev = config.config_revision
    expect(isOidcSessionCurrent({ auth_provider: 'oidc', oidc_session_version: 0 }, { ap: 'oidc', osv: 0, orev: cfgRev - 1 }, config)).toBe(false)
    expect(isOidcSessionCurrent({ auth_provider: 'oidc', oidc_session_version: 0 }, { ap: 'oidc', osv: 0, orev: cfgRev }, { ...config, enabled: false })).toBe(false)
  })

  it('fails closed without a usable encryption key but keeps local login data intact', async () => {
    await configure()
    const noKey: OidcRuntimeSettings = { ...settings, oidcEncryptionKey: '' }
    expect(isOidcEffectivelyEnabled(await oidcConfigRepository.get(), noKey)).toBe(false)
    expect(isOidcEffectivelyEnabled(await oidcConfigRepository.get(), { ...settings, oidcEncryptionKey: KEY_HEX })).toBe(false) // wrong key
    expect(isOidcEffectivelyEnabled(await oidcConfigRepository.get(), settings)).toBe(true)
    const begin = await beginOidcLogin({ settings: noKey, requestOrigin: origin })
    expect(begin).toEqual({ ok: false, code: 'oidc_unavailable' })
  })

  it('never exposes the secret in the config DTO', async () => {
    await configure()
    const dto = buildOidcConfigDto(await oidcConfigRepository.get(), settings, origin)
    const text = JSON.stringify(dto)
    expect(text).not.toContain(idp.clientSecret)
    expect(text).not.toContain('ciphertext')
    expect(text).not.toContain(KEY_B64)
    expect(dto).toMatchObject({ client_secret_configured: true, encryption_key_ready: true, secret_decryptable: true, callback_url: `${origin}/api/auth/oidc/callback` })
    expect(Object.keys(dto)).not.toContain('client_secret')
  })

  describe('config repository', () => {
    it('defaults disabled and only bumps revision on actual changes', async () => {
      const d = await oidcConfigRepository.get()
      expect(d).toMatchObject({ enabled: false, scopes: ['openid', 'profile'], groups_claim: 'groups', allow_unmatched_viewer: false, allow_http_issuer: false, config_revision: 0 })
      const a = await oidcConfigRepository.update({ enabled: false })
      expect(a.changed).toBe(false)
      const b = await oidcConfigRepository.update({ issuer: 'https://idp', client_id: 'c' })
      expect(b.config.config_revision).toBe(1)
      const c = await oidcConfigRepository.update({ issuer: 'https://idp', client_id: 'c', scopes: ['openid', 'profile'] })
      expect(c.changed).toBe(false)
      expect(c.config.config_revision).toBe(1)
    })

    it('retains the secret when omitted and clears explicitly', async () => {
      const key = parseOidcEncryptionKey(KEY_B64)
      const s1 = await oidcConfigRepository.update({ client_secret_ciphertext: encryptOidcSecret('one', key) })
      expect(s1.config.config_revision).toBe(1)
      const kept = await oidcConfigRepository.update({ client_id: 'x' })
      expect(kept.config.client_secret_ciphertext).toBe(s1.config.client_secret_ciphertext)
      const cleared = await oidcConfigRepository.update({ client_secret_ciphertext: null })
      expect(cleared.config.client_secret_ciphertext).toBeNull()
      expect(cleared.config.config_revision).toBe(3)
      expect((await oidcConfigRepository.update({ client_secret_ciphertext: null })).changed).toBe(false)
    })
  })

  describe('login transaction repository', () => {
    it('consumes atomically: exactly one of many concurrent consumers wins', async () => {
      const bindingHash = hashBindingValue(generateBindingValue())
      await oidcLoginTxnRepository.create({ state: 'st', nonce: 'n', codeVerifier: 'v', bindingHash, configRevision: 0 })
      const results = await Promise.all(Array.from({ length: 8 }, () => oidcLoginTxnRepository.consume({ state: 'st', bindingHash, currentRevision: 0 })))
      expect(results.filter(r => r.ok)).toHaveLength(1)
    })

    it('enforces TTL, per-binding and global bounds; purges expired', async () => {
      const bindingHash = hashBindingValue(generateBindingValue())
      const t0 = new Date('2026-01-01T00:00:00Z')
      await oidcLoginTxnRepository.create({ state: 'old', nonce: 'n', codeVerifier: 'v', bindingHash, configRevision: 0, now: t0 })
      const late = new Date(t0.getTime() + 11 * 60 * 1000)
      const expired = await oidcLoginTxnRepository.consume({ state: 'old', bindingHash, currentRevision: 0, now: late })
      expect(expired).toEqual({ ok: false, reason: 'expired' })
      await oidcLoginTxnRepository.create({ state: 'new', nonce: 'n', codeVerifier: 'v', bindingHash, configRevision: 0, now: late })
      expect(await prisma.oidcLoginTxn.count()).toBe(1) // expired one purged on create

      for (let i = 1; i < OIDC_TXN_MAX_PER_BINDING; i++) {
        await oidcLoginTxnRepository.create({ state: `s${i}`, nonce: 'n', codeVerifier: 'v', bindingHash, configRevision: 0, now: late })
      }
      await expect(oidcLoginTxnRepository.create({ state: 'over', nonce: 'n', codeVerifier: 'v', bindingHash, configRevision: 0, now: late })).rejects.toMatchObject({ statusCode: 429 })
      // another browser is unaffected
      await oidcLoginTxnRepository.create({ state: 'other', nonce: 'n', codeVerifier: 'v', bindingHash: hashBindingValue(generateBindingValue()), configRevision: 0, now: late })
      expect(await oidcLoginTxnRepository.purgeAll()).toBeGreaterThan(0)
      expect(await oidcLoginTxnRepository.countPending()).toBe(0)
    })

    it('stores only the state hash', async () => {
      await oidcLoginTxnRepository.create({ state: 'plain-state-value', nonce: 'n', codeVerifier: 'v', bindingHash: 'b', configRevision: 0 })
      const row = await prisma.oidcLoginTxn.findFirst()
      expect(JSON.stringify(row)).not.toContain('plain-state-value')
    })
  })

  describe('user repository', () => {
    const local = (username: string, role: 'admin' | 'viewer' = 'admin') =>
      userRepository.create({ username, display_name: username, password_hash: 'hash', role, language: 'en', is_setup_user: false })

    it('provisions concurrently without duplicates', async () => {
      const input = { issuer: 'https://idp', subject: 'same', role: 'viewer' as const, displayName: 'Same' }
      const res = await Promise.all(Array.from({ length: 5 }, () => userRepository.provisionOrSyncOidcUser(input)))
      expect(new Set(res.map(r => r.user.id)).size).toBe(1)
      expect(res.filter(r => r.created)).toHaveLength(1)
      expect(await prisma.user.count()).toBe(1)
    })

    it('keeps OIDC users unpromotable through manual update, but allows profile edits', async () => {
      const { user } = await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp', subject: 's', role: 'viewer', displayName: 'V' })
      await expect(userRepository.update(user.id, { role: 'admin' })).rejects.toMatchObject({ statusCode: 409 })
      await expect(userRepository.update(user.id, { password_hash: 'x' })).rejects.toMatchObject({ statusCode: 409 })
      await expect(userRepository.update(user.id, { username: 'newname' })).rejects.toMatchObject({ statusCode: 409 })
      const p = await userRepository.updateProfile(user.id, { display_name: 'New', language: 'de' })
      expect(p).toMatchObject({ display_name: 'New', language: 'de', role: 'viewer' })
      expect(await userRepository.update(user.id, { display_name: 'Again' })).toMatchObject({ display_name: 'Again' })
    })

    it('protects the last local emergency admin from delete/demote (even concurrently)', async () => {
      const a = await local('admin_a')
      await userRepository.provisionOrSyncOidcUser({ issuer: 'https://idp', subject: 'adm', role: 'admin', displayName: 'OidcAdmin' })
      await expect(userRepository.delete(a.id)).rejects.toMatchObject({ statusCode: 409 })
      await expect(userRepository.update(a.id, { role: 'viewer' })).rejects.toMatchObject({ statusCode: 409 })

      const b = await local('admin_b')
      const settled = await Promise.allSettled([userRepository.delete(a.id), userRepository.delete(b.id)])
      expect(settled.filter(s => s.status === 'fulfilled')).toHaveLength(1)
      expect(await prisma.user.count({ where: { auth_provider: 'local', role: 'admin' } })).toBe(1)

      const c = await local('viewer_c', 'viewer')
      expect(await userRepository.delete(c.id)).toBe(true)
      expect(await userRepository.delete('missing')).toBe(false)
    })

    it('invalidateOidcSessions never creates or touches local users', async () => {
      const l = await local('plain')
      expect(await userRepository.invalidateOidcSessions('https://idp', 'nope')).toBe(false)
      expect((await userRepository.getById(l.id))?.oidc_session_version).toBe(0)
    })
  })
})
