import { test, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { OidcCheckResultDto, OidcConfigDto } from '../../types/oidc'

const CANDIDATE_BASE = 'http://127.0.0.1:3105'
const SHOTS = process.env.OIDC_REVIEW_SHOTS_DIR
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile320: { width: 320, height: 640 }
} as const

/** Synthetic read-only settings fixture; no plaintext secret, ciphertext, or real provider data. */
const CONFIG = {
  enabled: true,
  issuer: 'https://identity.example.test',
  client_id: 'ezswm-review-fixture',
  client_secret_configured: true,
  scopes: ['openid', 'profile'],
  groups_claim: 'groups',
  admin_groups: ['fixture-admins'],
  viewer_groups: ['fixture-viewers'],
  allow_unmatched_viewer: false,
  allow_http_issuer: false,
  observed_groups: ['fixture-observed-group'],
  provider_name: null,
  config_revision: 3,
  updated_at: '2026-01-01T00:00:00.000Z',
  callback_url: 'https://identity.example.test/api/auth/oidc/callback',
  encryption_key_ready: true,
  secret_decryptable: true
} satisfies OidcConfigDto

const CHECK_RESULTS = {
  unsupported: {
    ok: false,
    code: 'unsupported_id_token_alg'
  } satisfies OidcCheckResultDto,
  success: {
    ok: true,
    issuer: CONFIG.issuer,
    token_endpoint_auth_method: 'client_secret_basic',
    id_token_alg: 'RS256',
    endpoints: { authorization: true, token: true, jwks: true, userinfo: true },
    warnings: []
  } satisfies OidcCheckResultDto
} as const

const COPY = {
  en: {
    settings: 'Settings',
    authTab: 'Authentication',
    connectionSection: 'Provider check',
    savedEnabled: 'Saved setting: enabled',
    checkButton: 'Check connection',
    saveButton: 'Save configuration',
    failedTitle: 'Provider check needs attention',
    failedMessage: 'The provider\'s advertised ID token signing algorithms are unsupported or invalid.',
    genericFailure: 'The saved provider configuration could not be verified. Check the issuer, client settings, and server key.',
    passedTitle: 'Provider check passed',
    passedMessage: 'The provider metadata was discovered and the saved configuration is ready for sign-in.',
    authMethod: 'Client authentication',
    basicMethod: 'Client secret (Basic)',
    tokenAlgorithm: 'ID token algorithm',
    endpointLabels: ['Authorize', 'Token', 'Signing keys', 'User info']
  },
  de: {
    settings: 'Einstellungen',
    authTab: 'Authentifizierung',
    connectionSection: 'Anbieter prüfen',
    savedEnabled: 'Gespeicherte Einstellung: aktiviert',
    checkButton: 'Verbindung prüfen',
    saveButton: 'Konfiguration speichern',
    failedTitle: 'Anbieterprüfung benötigt Aufmerksamkeit',
    failedMessage: 'Die vom Anbieter angegebenen Signaturalgorithmen für ID-Tokens werden nicht unterstützt oder sind ungültig.',
    genericFailure: 'Die gespeicherte Anbieterkonfiguration konnte nicht verifiziert werden. Prüfen Sie Aussteller, Client-Einstellungen und Server-Schlüssel.',
    passedTitle: 'Anbieterprüfung erfolgreich',
    passedMessage: 'Die Anbieter-Metadaten wurden gefunden und die gespeicherte Konfiguration ist für die Anmeldung bereit.',
    authMethod: 'Client-Authentifizierung',
    basicMethod: 'Client-Secret (Basic)',
    tokenAlgorithm: 'ID-Token-Algorithmus',
    endpointLabels: ['Autorisierung', 'Token', 'Signaturschlüssel', 'Benutzerinfo']
  }
} as const

type Lang = keyof typeof COPY
type ResultKind = 'unsupported' | 'success'
type Viewport = keyof typeof VIEWPORTS
type Theme = 'dark' | 'light'

const CASES: Array<{ lang: Lang, result: ResultKind, viewport: Viewport, theme: Theme }> = [
  { lang: 'en', result: 'unsupported', viewport: 'desktop', theme: 'dark' },
  { lang: 'de', result: 'unsupported', viewport: 'mobile320', theme: 'light' },
  { lang: 'en', result: 'success', viewport: 'desktop', theme: 'dark' },
  { lang: 'de', result: 'success', viewport: 'mobile320', theme: 'light' }
]

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const redact = (text: string) =>
  text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)

function watchStrictErrors(page: Page, errors: string[]) {
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${redact(message.text())}`)
  })
  page.on('pageerror', error => errors.push(`pageerror: ${redact(error.message)}`))
}

async function readLanguage(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const response = await request.get('/api/auth/me')
  if (!response.ok()) return ''
  return ((await response.json()) as { language?: string }).language ?? ''
}

async function selectLanguage(page: Page, lang: Lang) {
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English', exact: true }).click()
}

async function setTheme(page: Page, theme: Theme) {
  const wantsDark = theme === 'dark'
  const root = page.locator('html')
  if (await root.evaluate(el => el.classList.contains('dark')) !== wantsDark) {
    await page.getByRole('button', { name: wantsDark ? 'Switch to dark mode' : 'Switch to light mode', exact: true }).click()
  }
  await expect.poll(() => root.evaluate(el => el.classList.contains('dark'))).toBe(wantsDark)
}

function isOwnLanguageUpdate(method: string, pathname: string, postData: string | null, ownUserId: string) {
  if (method !== 'PUT' || pathname !== `/api/users/${ownUserId}` || !postData) return false
  let body: unknown
  try {
    body = JSON.parse(postData)
  } catch {
    return false
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false
  const payload = body as Record<string, unknown>
  return Object.keys(payload).length === 1 && (payload.language === 'en' || payload.language === 'de')
}

function isSavedConfigCheck(method: string, pathname: string, postData: string | null) {
  return method === 'POST' && pathname === '/api/auth/oidc/check' && postData === null
}

async function expectAlertInsideViewport(page: Page, alertRoot: ReturnType<Page['locator']>) {
  const viewport = page.viewportSize()!
  await alertRoot.scrollIntoViewIfNeeded()
  await expect(alertRoot).toBeVisible()
  const box = await alertRoot.boundingBox()
  expect(box, 'result notice has a rendered box').not.toBeNull()
  expect(box!.x, 'result notice fits the viewport horizontally').toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width, 'result notice fits the viewport horizontally').toBeLessThanOrEqual(viewport.width + 1)
  expect(box!.y, 'result notice is fully inside the viewport after normal scroll').toBeGreaterThanOrEqual(-1)
  expect(box!.y + box!.height, 'result notice is fully inside the viewport after normal scroll').toBeLessThanOrEqual(viewport.height + 1)
}

async function captureResult(page: Page, filename: string) {
  if (!SHOTS) throw new Error('OIDC_REVIEW_SHOTS_DIR must point to the private screenshot directory')
  mkdirSync(SHOTS, { recursive: true, mode: 0o700 })
  await page.screenshot({ path: join(SHOTS, filename) })
}

test.describe('OIDC review: saved check result', () => {
  for (const testCase of CASES) {
    const { lang, result, viewport, theme } = testCase
    test(`${lang}-${result}-${viewport}: saved provider check shows the localized result without config writes`, async ({ page, request, baseURL }) => {
      expect(baseURL, 'review evidence must use only the owned isolated candidate').toBe(CANDIDATE_BASE)

      // Read the own fixture identity before browser watchers; retain only its ID in memory for the write allowlist.
      const identityResponse = await request.get('/api/auth/me')
      expect(identityResponse.status(), 'fresh fixture self identity is available').toBe(200)
      const identity = await identityResponse.json() as { id?: unknown, language?: unknown }
      const ownUserId = typeof identity.id === 'string' ? identity.id : ''
      expect(ownUserId.length > 0, 'self identity has an ID without exposing it').toBe(true)
      expect(identity.language, 'fresh fixture language starts in English').toBe('en')

      await page.setViewportSize(VIEWPORTS[viewport])
      const errors: string[] = []
      const forbiddenWrites: string[] = []
      let languageWrites = 0
      let configGets = 0
      let configMutations = 0
      let checkRequests = 0
      let checkMockCalls = 0
      let checkBodiesAbsent = true
      watchStrictErrors(page, errors)

      page.on('request', (browserRequest) => {
        const url = new URL(browserRequest.url())
        const method = browserRequest.method()
        if (!url.pathname.startsWith('/api/') || method === 'GET') return
        const postData = browserRequest.postData()
        if (isOwnLanguageUpdate(method, url.pathname, postData, ownUserId)) {
          languageWrites++
          return
        }
        if (method === 'POST' && url.pathname === '/api/auth/oidc/check') {
          checkRequests++
          if (postData !== null) checkBodiesAbsent = false
        }
      })

      await page.route('**/api/**', async (route) => {
        const browserRequest = route.request()
        const method = browserRequest.method()
        if (method === 'GET') return route.fallback()
        const url = new URL(browserRequest.url())
        const postData = browserRequest.postData()
        if (isOwnLanguageUpdate(method, url.pathname, postData, ownUserId)) return route.fallback()
        if (isSavedConfigCheck(method, url.pathname, postData)) return route.fallback()
        forbiddenWrites.push('unexpected API write blocked')
        return route.abort()
      })

      await page.route('**/api/auth/oidc/config', async (route) => {
        if (route.request().method() !== 'GET') {
          configMutations++
          forbiddenWrites.push('unexpected OIDC config write blocked')
          return route.abort()
        }
        configGets++
        return json(route, CONFIG)
      })

      await page.route('**/api/auth/oidc/check', async (route) => {
        if (!isSavedConfigCheck(route.request().method(), new URL(route.request().url()).pathname, route.request().postData())) {
          forbiddenWrites.push('unexpected saved-config check request blocked')
          return route.abort()
        }
        checkMockCalls++
        const response = result === 'unsupported' ? CHECK_RESULTS.unsupported : CHECK_RESULTS.success
        return json(route, response)
      })

      try {
        await page.goto('/')
        await expect(page.locator('main h1').first()).toBeVisible()
        // The hydrated theme button is only a bounded public UI readiness proxy.
        await expect(page.getByRole('button', { name: /^Switch to (light|dark) mode$/ })).toBeVisible()
        if (lang === 'de') {
          await selectLanguage(page, 'de')
          await expect.poll(() => readLanguage(request), { message: 'header language change reached the fixture profile' }).toBe('de')
        }
        await setTheme(page, theme)

        await page.goto('/settings')
        await expect(page.locator('main h1').first()).toHaveText(COPY[lang].settings)
        await page.getByRole('tab', { name: COPY[lang].authTab, exact: true }).click()
        await expect(page.getByRole('heading', { name: COPY[lang].connectionSection, exact: true })).toBeVisible()
        await expect(page.getByText(COPY[lang].savedEnabled, { exact: true })).toBeVisible()
        await expect.poll(() => configGets, { message: 'synthetic saved-config GET loaded' }).toBeGreaterThan(0)

        const checkButton = page.getByRole('button', { name: COPY[lang].checkButton, exact: true })
        const saveButton = page.getByRole('button', { name: COPY[lang].saveButton, exact: true })
        await expect(checkButton).toBeEnabled()
        await expect(saveButton).toBeDisabled()
        await checkButton.click()
        await expect.poll(() => checkRequests, { message: 'one saved-config check request' }).toBe(1)
        await expect.poll(() => checkMockCalls, { message: 'one synthetic saved-config response' }).toBe(1)

        const copy = COPY[lang]
        const expectedTitle = result === 'unsupported' ? copy.failedTitle : copy.passedTitle
        const title = page.getByText(expectedTitle, { exact: true })
        const alertRoot = title.locator('xpath=ancestor::*[@data-slot="root"][1]')
        const description = alertRoot.locator('[data-slot="description"]')
        await expect(alertRoot).toHaveCount(1)
        await expect(alertRoot).toHaveAttribute('data-slot', 'root')
        await expect(description).toBeVisible()
        if (result === 'unsupported') {
          await expect(description).toHaveText(copy.failedMessage)
          await expect(description).not.toHaveText(copy.genericFailure)
          await expect(alertRoot).not.toContainText('unsupported_id_token_alg')
        } else {
          await expect(description).toContainText(copy.passedMessage)
          await expect(description).toContainText(`${copy.authMethod}: ${copy.basicMethod}`)
          await expect(description).toContainText(`${copy.tokenAlgorithm}: RS256`)
          for (const endpoint of copy.endpointLabels) await expect(description).toContainText(endpoint)
        }
        await expect(checkButton).toBeEnabled()
        await expect(saveButton).toBeDisabled()
        await expectAlertInsideViewport(page, alertRoot)
        await captureResult(page, `oidc-review-${lang}-${result}-${viewport}.png`)
      } finally {
        if (lang === 'de') {
          await selectLanguage(page, 'en')
          await expect(page.locator('main h1').first()).toHaveText(COPY.en.settings)
        }
        await expect.poll(() => readLanguage(request), { message: 'fixture admin language restored to English' }).toBe('en')
      }

      expect(configMutations, 'saved OIDC config is never changed').toBe(0)
      expect(checkRequests, 'exactly one saved-config check was requested').toBe(1)
      expect(checkMockCalls, 'exactly one check response was mocked').toBe(1)
      expect(checkBodiesAbsent, 'saved-config check sends no credentials or request body').toBe(true)
      expect(languageWrites, 'only EN/DE self-language changes were written').toBe(lang === 'de' ? 2 : 0)
      expect(forbiddenWrites, 'no other API writes are permitted').toEqual([])
      expect(errors, 'strict browser console/page-error guard').toEqual([])
    })
  }
})
