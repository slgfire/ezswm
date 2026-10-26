import { randomUUID } from 'node:crypto'
import { test, expect, type APIRequest, type APIRequestContext, type BrowserContext, type Page, type Route } from '@playwright/test'

interface Profile {
  id: string
  username: string
  role: 'admin' | 'viewer'
  language: 'en' | 'de'
  auth_provider: 'local' | 'oidc'
}

interface TokenMetadata {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const PASSWORD = `Api-token-${randomUUID()}`
const PREFIX = `e2e_api_tokens_${randomUUID().replaceAll('-', '').slice(0, 12)}`
const EXPECTED_CONSOLE = /Failed to load resource.*status of 409/i

const UI = {
  en: {
    account: 'Account', title: 'API tokens', name: 'Token name', expiry: 'Expires (optional)', create: 'Create token',
    nameRequired: 'Enter a token name.', past: 'Expiration must be in the future.', conflict: 'A token with this name already exists or your account has reached the 10-token limit. Choose another name or revoke a token.',
    empty: 'You have not created any API tokens.', revoke: 'Revoke', revokeAll: 'Revoke all', revokeTitle: 'Revoke API token?', allTitle: 'Revoke all API tokens?',
    revokeNamed: (name: string) => `Revoke token ${name}`,
    confirm: 'Revoke', confirmAll: 'Revoke all', secretTitle: 'Copy this token now', copy: 'Copy token', copied: 'Token copied', dismiss: 'Dismiss secret'
  },
  de: {
    account: 'Konto', title: 'API-Tokens', name: 'Tokenname', expiry: 'Läuft ab (optional)', create: 'Token erstellen',
    nameRequired: 'Geben Sie einen Token-Namen ein.', past: 'Das Ablaufdatum muss in der Zukunft liegen.', conflict: 'Ein Token mit diesem Namen existiert bereits oder Ihr Konto hat das Limit von 10 Tokens erreicht. Wählen Sie einen anderen Namen oder widerrufen Sie ein Token.',
    empty: 'Sie haben noch keine API-Tokens erstellt.', revoke: 'Widerrufen', revokeAll: 'Alle widerrufen', revokeTitle: 'API-Token widerrufen?', allTitle: 'Alle API-Tokens widerrufen?',
    revokeNamed: (name: string) => `Token ${name} widerrufen`,
    confirm: 'Widerrufen', confirmAll: 'Alle widerrufen', secretTitle: 'Token jetzt kopieren', copy: 'Token kopieren', copied: 'Token kopiert', dismiss: 'Secret ausblenden'
  }
} as const

function localOrigin() {
  const baseURL = test.info().project.use.baseURL
  expect(typeof baseURL).toBe('string')
  const url = new URL(baseURL as string)
  expect(LOCAL_HOSTS.has(url.hostname), 'API-token E2E must use an isolated local app').toBe(true)
  return url.origin
}

const json = (route: Route, value: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })

function watchErrors(page: Page, errors: string[], secrets: string[]) {
  const scrub = (value: string) => secrets.reduce((text, secret) => text.replaceAll(secret, '<secret>'), value)
  page.on('pageerror', () => errors.push('pageerror'))
  // Chromium reports the 409 console error after waitForResponse() resolves, so a flag reset in
  // finally() races it. Each announced duplicate instead grants one allowance, consumed only by a
  // "Failed to load resource ... 409" console error whose own request URL is POST /api/auth/tokens.
  let expectedConflicts = 0
  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = scrub(message.text())
    const isTokenCreate409 = EXPECTED_CONSOLE.test(text) && new URL(message.location().url || 'about:blank').pathname === '/api/auth/tokens'
    if (expectedConflicts > 0 && isTokenCreate409) { expectedConflicts--; return }
    errors.push(text)
  })
  return Object.assign((expecting: boolean) => { if (expecting) expectedConflicts++ }, { pending: () => expectedConflicts })
}

async function createSyntheticUser(api: APIRequestContext, role: Profile['role'], language: Profile['language']) {
  const username = `${PREFIX}_${role}`
  const response = await api.post('/api/users', {
    data: { username, display_name: `E2E ${role} API tokens`, password: PASSWORD, role, language }
  })
  expect(response.status(), 'create an isolated synthetic local account').toBe(201)
  return await response.json() as Profile
}

async function loginOwner(request: APIRequest, origin: string, profile: Profile) {
  const api = await request.newContext({ baseURL: origin, storageState: { cookies: [], origins: [] } })
  const response = await api.post('/api/auth/login', { data: { username: profile.username, password: PASSWORD } })
  expect(response.ok(), `log in synthetic ${profile.role}`).toBe(true)
  return api
}

async function waitForAccountTab(page: Page, language: 'en' | 'de') {
  const tab = page.getByRole('tab', { name: UI[language].account, exact: true })
  await expect(tab).toBeVisible()
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click()
  await expect(page.getByRole('heading', { name: UI[language].title, level: 3 })).toBeVisible()
}

async function waitForNuxtHydration(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as (Element & { __vue_app__?: unknown }) | null
    return Boolean(root?.__vue_app__)
  })
}

const localDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function createTokenThroughUi(page: Page, language: 'en' | 'de', name: string, expiry?: string) {
  const t = UI[language]
  await page.getByRole('textbox', { name: t.name }).fill(name)
  if (expiry !== undefined) await page.getByLabel(t.expiry).fill(expiry)
  const response = page.waitForResponse(res => res.request().method() === 'POST' && new URL(res.url()).pathname === '/api/auth/tokens')
  await page.getByRole('button', { name: t.create, exact: true }).click()
  return await response
}

async function runOwnerFlow(
  page: Page,
  api: APIRequestContext,
  language: 'en' | 'de',
  role: Profile['role'],
  secrets: string[],
  expectDuplicateConflict: (expecting: boolean) => void
) {
  const t = UI[language]
  await page.setViewportSize({ width: 390, height: 844 })
  let tokenPosts = 0
  page.on('request', req => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/auth/tokens') tokenPosts++
  })
  const listRequest = page.waitForResponse(res => res.request().method() === 'GET' && new URL(res.url()).pathname === '/api/auth/tokens')
  const settingsReady = role === 'admin'
    ? page.waitForResponse(res => res.request().method() === 'GET' && new URL(res.url()).pathname === '/api/auth/oidc/config')
    : null
  await page.goto('/settings')
  if (settingsReady) expect((await settingsReady).ok(), 'Settings onMounted OIDC config GET').toBe(true)
  else await waitForNuxtHydration(page)
  await waitForAccountTab(page, language)
  expect((await listRequest).status(), `${role} can list only their own tokens`).toBe(200)
  await expect(page.getByTestId('api-token-empty')).toContainText(t.empty)

  // Client validation blocks blank names and past expirations without sending secrets or writes.
  await page.getByRole('textbox', { name: t.name }).fill('   ')
  await page.getByRole('button', { name: t.create, exact: true }).click()
  await expect(page.getByText(t.nameRequired, { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: t.name }).fill(`${PREFIX}_${role}_validation`)
  await page.getByLabel(t.expiry).fill(localDateTime(new Date(Date.now() - 60_000)))
  await page.getByRole('button', { name: t.create, exact: true }).click()
  await expect(page.getByText(t.past, { exact: true })).toBeVisible()
  expect(tokenPosts, 'invalid forms do not call the token API').toBe(0)
  await page.getByLabel(t.expiry).fill('')

  const name = `${PREFIX}_${role}_one`
  const createResponse = await createTokenThroughUi(page, language, `  ${name}  `)
  expect(createResponse.status()).toBe(201)
  const created = await createResponse.json() as TokenMetadata & { token: string }
  const secret = created.token
  secrets.push(secret)
  expect(secret).toMatch(/^ezswm_[A-Za-z0-9_-]{32}$/)
  expect(createResponse.request().postDataJSON()).toEqual({ name })
  await expect(page.getByRole('alert').filter({ hasText: t.secretTitle })).toBeVisible()
  const secretDisplay = page.getByTestId('api-token-secret')
  expect((await secretDisplay.innerText()) === secret).toBe(true)
  expect(await secretDisplay.evaluate(el => getComputedStyle(el).wordBreak !== 'normal')).toBe(true)

  const browserContext = page.context()
  await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: t.copy, exact: true }).click()
  await expect(page.getByText(t.copied, { exact: true })).toBeVisible()
  expect(await page.evaluate(async value => (await navigator.clipboard.readText()) === value, secret)).toBe(true)

  const tokenRow = page.getByTestId('api-token-row').filter({ hasText: name })
  await expect(tokenRow).toBeVisible()
  const tokenRowHtml = await tokenRow.evaluate(element => element.outerHTML)
  for (const forbidden of [secret, 'token_hash']) {
    expect(tokenRowHtml.includes(forbidden)).toBe(false)
  }
  await page.getByRole('button', { name: t.dismiss, exact: true }).click()
  await expect(page.getByTestId('api-token-secret')).toHaveCount(0)
  expect((await page.content()).includes(secret)).toBe(false)

  // A duplicate reaches the real 409 handler and shows a localized safe message.
  expectDuplicateConflict(true)
  const duplicateResponse = await createTokenThroughUi(page, language, name)
  expect(duplicateResponse.status()).toBe(409)
  await expect(page.getByRole('alert').filter({ hasText: t.conflict })).toBeVisible()

  // The GET contract contains metadata only; there is no secret/hash field and the one-time value cannot be fetched.
  const list = await api.get('/api/auth/tokens')
  expect(list.status()).toBe(200)
  const rows = await list.json() as Array<Record<string, unknown>>
  const metadata = rows.find(item => item.name === name)
  expect(!!metadata).toBe(true)
  expect(Object.keys(metadata ?? {}).sort()).toEqual(['created_at', 'expires_at', 'id', 'last_used_at', 'name'])
  expect(JSON.stringify(rows).includes(secret)).toBe(false)
  expect(JSON.stringify(rows).includes('token_hash')).toBe(false)

  // Reload discards the one-time display; then revoke one token after an explicit cancel/confirm choice.
  const reloadList = page.waitForResponse(res => res.request().method() === 'GET' && new URL(res.url()).pathname === '/api/auth/tokens')
  await page.reload()
  await waitForAccountTab(page, language)
  expect((await reloadList).ok()).toBe(true)
  expect((await page.content()).includes(secret)).toBe(false)
  const refreshedRow = page.getByTestId('api-token-row').filter({ hasText: name })
  await refreshedRow.getByRole('button', { name: t.revokeNamed(name) }).click()
  const revokeDialog = page.getByRole('dialog')
  await expect(revokeDialog).toBeVisible()
  await revokeDialog.getByRole('button', { name: language === 'en' ? 'Cancel' : 'Abbrechen' }).click()
  await expect(revokeDialog).toHaveCount(0)
  await expect(refreshedRow).toBeVisible()
  const deleteOne = page.waitForResponse(res => res.request().method() === 'DELETE' && new URL(res.url()).pathname.startsWith('/api/auth/tokens/'))
  const revokeButton = refreshedRow.getByRole('button', { name: t.revokeNamed(name) })
  await revokeButton.click()
  await page.getByRole('dialog').getByRole('button', { name: t.confirm, exact: true }).click()
  expect((await deleteOne).status()).toBe(204)
  await expect(refreshedRow).toHaveCount(0)

  // An optional future local date is serialized as UTC. Create two tokens, then revoke all.
  const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const futureName = `${PREFIX}_${role}_future`
  const futureResponse = await createTokenThroughUi(page, language, futureName, localDateTime(future))
  expect(futureResponse.status()).toBe(201)
  const futureCreated = await futureResponse.json() as TokenMetadata & { token: string }
  const futureSecret = futureCreated.token
  secrets.push(futureSecret)
  const expiryBody = futureResponse.request().postDataJSON() as { expires_at?: string }
  expect(typeof expiryBody.expires_at === 'string' && expiryBody.expires_at.endsWith('Z') && Number.isFinite(Date.parse(expiryBody.expires_at))).toBe(true)
  expect(futureCreated.expires_at === expiryBody.expires_at).toBe(true)
  await page.getByRole('button', { name: t.dismiss, exact: true }).click()
  expect((await page.content()).includes(futureSecret)).toBe(false)

  const thirdName = `${PREFIX}_${role}_third`
  const thirdResponse = await createTokenThroughUi(page, language, thirdName)
  expect(thirdResponse.status()).toBe(201)
  const thirdCreated = await thirdResponse.json() as TokenMetadata & { token: string }
  secrets.push(thirdCreated.token)
  await page.getByRole('button', { name: t.dismiss, exact: true }).click()
  expect((await page.content()).includes(thirdCreated.token)).toBe(false)

  const allRows = await (await api.get('/api/auth/tokens')).json() as Array<Record<string, unknown>>
  for (const secret of [futureSecret, thirdCreated.token]) expect(JSON.stringify(allRows).includes(secret)).toBe(false)
  expect(JSON.stringify(allRows).includes('token_hash')).toBe(false)

  await page.getByRole('button', { name: t.revokeAll, exact: true }).click()
  const allDialog = page.getByRole('dialog')
  await expect(allDialog).toBeVisible()
  const deleteAll = page.waitForResponse(res => res.request().method() === 'DELETE' && new URL(res.url()).pathname === '/api/auth/tokens')
  await allDialog.getByRole('button', { name: t.confirmAll, exact: true }).click()
  expect((await deleteAll).status()).toBe(200)
  await expect(page.getByTestId('api-token-empty')).toContainText(t.empty)
  expect((await (await api.get('/api/auth/tokens')).json()).length).toBe(0)

}

// One disposable app only: these tests create synthetic users and tokens and clean them up.
test.use({ screenshot: 'off', trace: 'off' })
test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('local Admin and Viewer manage their own API tokens in English and German; a mocked SSO profile uses the same token UI', async ({ page, request, browser, playwright, baseURL }) => {
  const origin = localOrigin()
  const meResponse = await request.get('/api/auth/me')
  expect(meResponse.ok(), 'isolated app has an authenticated admin fixture').toBe(true)
  const me = await meResponse.json() as Profile
  expect(me.role).toBe('admin')

  const secrets: string[] = []
  const errors: string[] = []
  watchErrors(page, errors, secrets)
  let adminProfile: Profile | undefined
  let viewerProfile: Profile | undefined
  let adminApi: APIRequestContext | undefined
  let viewerApi: APIRequestContext | undefined
  let adminContext: BrowserContext | undefined
  let viewerContext: BrowserContext | undefined
  let oidcContext: BrowserContext | undefined

  try {
    adminProfile = await createSyntheticUser(request, 'admin', 'en')
    viewerProfile = await createSyntheticUser(request, 'viewer', 'de')
    adminApi = await loginOwner(playwright.request, origin, adminProfile)
    viewerApi = await loginOwner(playwright.request, origin, viewerProfile)
    adminContext = await browser.newContext({ baseURL: baseURL!, storageState: await adminApi.storageState() })
    viewerContext = await browser.newContext({ baseURL: baseURL!, storageState: await viewerApi.storageState() })
    const adminPage = await adminContext.newPage()
    const viewerPage = await viewerContext.newPage()
    const expectAdminDuplicateConflict = watchErrors(adminPage, errors, secrets)
    const expectViewerDuplicateConflict = watchErrors(viewerPage, errors, secrets)

    await runOwnerFlow(adminPage, adminApi, 'en', 'admin', secrets, expectAdminDuplicateConflict)
    await runOwnerFlow(viewerPage, viewerApi, 'de', 'viewer', secrets, expectViewerDuplicateConflict)

    // Every announced duplicate must have produced its expected console error.
    expect(expectAdminDuplicateConflict.pending()).toBe(0)
    expect(expectViewerDuplicateConflict.pending()).toBe(0)

    // [MOCK] Synthetic SSO (OIDC) profile: auth, profile and token endpoints are all mocked in the browser
    // (no real IdP, no real OIDC JWT, no real protected API call). Backend issuance/lifecycle is covered by root tests.
    oidcContext = await browser.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    const oidcPage = await oidcContext.newPage()
    await oidcPage.setViewportSize({ width: 1440, height: 900 })
    const oidcProfile = { ...adminProfile, role: 'viewer', auth_provider: 'oidc', language: 'de' }
    const mockSecret = `ezswm_${randomUUID().replaceAll('-', '').slice(0, 32)}`
    secrets.push(mockSecret)
    const mockName = `${PREFIX}_oidc_mock`
    const mockTokens: TokenMetadata[] = []
    const seen: string[] = []
    let createBody: unknown
    await oidcPage.route('**/api/auth/login', route => json(route, { user: oidcProfile, token: 'synthetic-ui-session' }))
    await oidcPage.route('**/api/auth/me', route => json(route, oidcProfile))
    await oidcPage.route('**/api/auth/oidc/status', route => json(route, { enabled: false }))
    await oidcPage.route('**/api/sites', route => json(route, []))
    await oidcPage.route('**/api/auth/tokens', (route) => {
      const method = route.request().method()
      seen.push(method)
      if (method === 'GET') return json(route, mockTokens)
      if (method === 'POST') {
        createBody = route.request().postDataJSON()
        const row = { id: randomUUID(), name: (createBody as { name: string }).name, created_at: new Date().toISOString(), last_used_at: null, expires_at: null }
        mockTokens.push(row)
        return json(route, { ...row, token: mockSecret }, 201)
      }
      return route.fallback()
    })
    await oidcPage.route('**/api/auth/tokens/*', (route) => {
      seen.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
      mockTokens.length = 0
      return route.fulfill({ status: 204 })
    })
    await oidcPage.goto('/login')
    // Nuxt still reports isHydrating after the load event; filling earlier can be lost to hydration.
    await oidcPage.waitForFunction(() => (window as unknown as { useNuxtApp: () => { isHydrating: boolean } }).useNuxtApp().isHydrating === false)
    await oidcPage.getByLabel('Username').fill(oidcProfile.username)
    await oidcPage.getByLabel('Password').fill(PASSWORD)
    await oidcPage.getByRole('button', { name: 'Login', exact: true }).click()
    await expect(oidcPage).toHaveURL(/\/sites$/)
    const oidcList = oidcPage.waitForResponse(res => res.request().method() === 'GET' && new URL(res.url()).pathname === '/api/auth/tokens')
    await oidcPage.getByRole('link', { name: 'Einstellungen', exact: true }).click()
    await waitForAccountTab(oidcPage, 'de')
    expect((await oidcList).status(), 'SSO profile lists its tokens').toBe(200)
    await expect(oidcPage.getByTestId('api-token-empty')).toContainText(UI.de.empty)
    // Create form is present for SSO accounts; blank expiry sends only the name.
    const oidcCreate = await createTokenThroughUi(oidcPage, 'de', mockName)
    expect(oidcCreate.status()).toBe(201)
    expect(createBody).toEqual({ name: mockName })
    await expect(oidcPage.getByRole('alert').filter({ hasText: UI.de.secretTitle })).toBeVisible()
    expect((await oidcPage.getByTestId('api-token-secret').innerText()) === mockSecret).toBe(true)
    const oidcRow = oidcPage.getByTestId('api-token-row').filter({ hasText: mockName })
    await expect(oidcRow).toBeVisible()
    expect((await oidcRow.evaluate(element => element.outerHTML)).includes(mockSecret)).toBe(false)
    await oidcPage.getByRole('button', { name: UI.de.dismiss, exact: true }).click()
    await expect(oidcPage.getByTestId('api-token-secret')).toHaveCount(0)
    expect((await oidcPage.content()).includes(mockSecret)).toBe(false)
    // Revoke the mocked token through the UI.
    await oidcRow.getByRole('button', { name: UI.de.revokeNamed(mockName) }).click()
    await oidcPage.getByRole('dialog').getByRole('button', { name: UI.de.confirm, exact: true }).click()
    await expect(oidcRow).toHaveCount(0)
    expect(seen).toContain('POST')
    expect(seen.some(entry => /^DELETE \/api\/auth\/tokens\/[^/]+$/.test(entry))).toBe(true)
  } finally {
    await oidcContext?.close()
    await adminContext?.close()
    await viewerContext?.close()
    await adminApi?.dispose()
    await viewerApi?.dispose()
    if (viewerProfile) await request.delete(`/api/users/${viewerProfile.id}`)
    if (adminProfile) await request.delete(`/api/users/${adminProfile.id}`)
  }

  // Secrets are scrubbed from error capture; ensure no secret survives outside the one-time UI flow.
  for (const secret of secrets) expect(secret.length > 0).toBe(true)
  expect(errors).toEqual([])
  expect(me.auth_provider).toBe('local')
})
