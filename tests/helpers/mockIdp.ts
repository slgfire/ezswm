import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { constants as cryptoConstants, createHash, generateKeyPairSync, randomBytes, sign as cryptoSign } from 'node:crypto'

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')

export interface TokenRequest {
  authorization: string
  params: URLSearchParams
}

export interface IdpScenario {
  /** Extra/override ID token claims. */
  idClaims?: Record<string, unknown>
  /** `undefined` => UserInfo returns `{ sub }` only. */
  userInfo?: Record<string, unknown>
  /** Override the `sub` UserInfo reports (mismatch attack). */
  userInfoSub?: string
  userInfoStatus?: number
}

export interface MockIdpOptions {
  /** Advertised `token_endpoint_auth_methods_supported` (`null` => omit). */
  authMethods?: string[] | null
  /** Advertise a userinfo endpoint. */
  userinfo?: boolean
  /** Host name used in advertised token/jwks/userinfo/authorization URLs (default: issuer host). */
  endpointHost?: string
  /** Make /jwks answer with a 302. */
  jwksRedirect?: boolean
  /** Make /userinfo answer with a 302. */
  userinfoRedirect?: boolean
  /** Make /token answer with a 302. */
  tokenRedirect?: boolean
  /** Advertised `id_token_signing_alg_values_supported` (`null` => omit the field; any shape allowed for negative tests). Default `['RS256']`. */
  advertisedIdTokenAlgorithms?: unknown
  /** Discovery `issuer` value (`null` => omit the field). Default: the real issuer. */
  metadataIssuer?: string | null
  /** Algorithm used to REALLY sign ID tokens and to label the public JWKS key. Default RS256. */
  signingAlg?: 'RS256' | 'PS256'
  /** Sign ID tokens with a different (unpublished) RSA key. */
  rogueSigningKey?: boolean
  /** Alter the signed payload after signing (signature no longer matches). */
  tamperPayload?: boolean
}

/**
 * Real-HTTP mock OpenID provider with real RSA (RS256) signatures. Independent of the
 * foundation suite's inline mock; configurable for provider-compatibility behaviour.
 */
export class ProviderMockIdp {
  server!: Server
  issuer = ''
  port = 0
  clientId = 'ezswm-client'
  clientSecret = 'mock-secret'
  kid = 'kid-compat'
  key = generateKeyPairSync('rsa', { modulusLength: 2048 })
  rogueKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  opts: MockIdpOptions = {}
  pending = new Map<string, { challenge: string, nonce: string, scenario: IdpScenario }>()
  tokenRequests: TokenRequest[] = []
  userInfoAuth: string[] = []
  hits: string[] = []

  async start(issuerHost = '127.0.0.1') {
    this.server = createServer((req, res) => this.handle(req, res))
    await new Promise<void>(r => this.server.listen(0, '127.0.0.1', r))
    this.port = (this.server.address() as AddressInfo).port
    this.issuer = `http://${issuerHost}:${this.port}`
  }

  stop() {
    this.server.close()
  }

  reset(opts: MockIdpOptions = {}) {
    this.opts = { userinfo: true, ...opts }
    this.pending.clear()
    this.tokenRequests = []
    this.userInfoAuth = []
    this.hits = []
  }

  private base() {
    return this.opts.endpointHost ? `http://${this.opts.endpointHost}:${this.port}` : this.issuer
  }

  private handle(req: IncomingMessage, res: import('node:http').ServerResponse) {
    const url = new URL(req.url ?? '/', this.issuer)
    this.hits.push(`${req.method} ${url.pathname}`)
    const json = (obj: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(obj))
    }
    const redirect = () => {
      res.writeHead(302, { location: `${this.issuer}/elsewhere` })
      res.end()
    }
    const base = this.base()
    if (url.pathname === '/.well-known/openid-configuration') {
      return json({
        ...(this.opts.metadataIssuer === null ? {} : { issuer: this.opts.metadataIssuer ?? this.issuer }),
        authorization_endpoint: `${base}/authorize`,
        token_endpoint: `${base}/token`,
        jwks_uri: `${base}/jwks`,
        ...(this.opts.userinfo ? { userinfo_endpoint: `${base}/userinfo` } : {}),
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        ...(this.opts.advertisedIdTokenAlgorithms === null ? {} : { id_token_signing_alg_values_supported: 'advertisedIdTokenAlgorithms' in this.opts ? this.opts.advertisedIdTokenAlgorithms : ['RS256'] }),
        ...(this.opts.authMethods === null ? {} : { token_endpoint_auth_methods_supported: this.opts.authMethods ?? ['client_secret_basic', 'client_secret_post'] }),
        code_challenge_methods_supported: ['S256']
      })
    }
    if (url.pathname === '/jwks') {
      if (this.opts.jwksRedirect) return redirect()
      return json({ keys: [{ ...(this.key.publicKey.export({ format: 'jwk' }) as object), kid: this.kid, use: 'sig', alg: this.opts.signingAlg ?? 'RS256' }] })
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      if (this.opts.tokenRedirect) return redirect()
      let body = ''
      req.on('data', c => (body += c))
      req.on('end', () => {
        const params = new URLSearchParams(body)
        this.tokenRequests.push({ authorization: String(req.headers.authorization ?? ''), params })
        const meta = this.pending.get(params.get('code') ?? '')
        const challenge = createHash('sha256').update(params.get('code_verifier') ?? '').digest('base64url')
        if (!meta || meta.challenge !== challenge) return json({ error: 'invalid_grant' }, 400)
        return json({ access_token: `at-${params.get('code')}`, token_type: 'Bearer', id_token: this.idToken(meta.nonce, meta.scenario), expires_in: 300 })
      })
      return
    }
    if (url.pathname === '/userinfo') {
      if (this.opts.userinfoRedirect) return redirect()
      const auth = String(req.headers.authorization ?? '')
      this.userInfoAuth.push(auth)
      const code = auth.replace(/^Bearer at-/, '')
      const meta = this.pending.get(code)
      if (!meta) return json({ error: 'invalid_token' }, 401)
      const sc = meta.scenario
      if (sc.userInfoStatus && sc.userInfoStatus !== 200) return json({ error: 'server_error' }, sc.userInfoStatus)
      return json({ sub: sc.userInfoSub ?? 'user-1', ...(sc.userInfo ?? {}) })
    }
    res.writeHead(404).end()
  }

  idToken(nonce: string, sc: IdpScenario): string {
    const now = Math.floor(Date.now() / 1000)
    const payload = { iss: this.issuer, aud: this.clientId, sub: 'user-1', iat: now, exp: now + 300, nonce, ...sc.idClaims }
    const alg = this.opts.signingAlg ?? 'RS256'
    const data = `${b64u(JSON.stringify({ alg, typ: 'JWT', kid: this.kid }))}.${b64u(JSON.stringify(payload))}`
    const privateKey = this.opts.rogueSigningKey ? this.rogueKey.privateKey : this.key.privateKey
    // PS256 is signed with REAL RSASSA-PSS (SHA-256, salt length 32); RS256 with PKCS#1 v1.5.
    const signature = alg === 'PS256'
      ? cryptoSign('sha256', Buffer.from(data), { key: privateKey, padding: cryptoConstants.RSA_PKCS1_PSS_PADDING, saltLength: 32 })
      : cryptoSign('sha256', Buffer.from(data), privateKey)
    if (this.opts.tamperPayload) {
      const forged = b64u(JSON.stringify({ ...payload, sub: 'attacker' }))
      return `${b64u(JSON.stringify({ alg, typ: 'JWT', kid: this.kid }))}.${forged}.${b64u(signature)}`
    }
    return `${data}.${b64u(signature)}`
  }

  /** Register the authorization request's PKCE challenge + nonce; returns the callback query. */
  prepare(authUrl: string, scenario: IdpScenario = {}): URLSearchParams {
    const u = new URL(authUrl)
    const code = `c${randomBytes(6).toString('hex')}`
    this.pending.set(code, { challenge: u.searchParams.get('code_challenge')!, nonce: u.searchParams.get('nonce')!, scenario })
    return new URLSearchParams({ code, state: u.searchParams.get('state')! })
  }
}
