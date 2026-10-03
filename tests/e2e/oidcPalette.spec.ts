import { test, expect, type Locator, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { OidcConfigDto } from '../../types/oidc'

const CANDIDATE_BASE = 'http://127.0.0.1:3105'
const SHOTS = process.env.AUTH_NEUTRAL_SHOTS_DIR
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile320: { width: 320, height: 640 }
} as const
const MATRIX = (['en', 'de'] as const).flatMap(lang =>
  (['dark', 'light'] as const).flatMap(theme =>
    (['desktop', 'mobile320'] as const).map(viewport => ({ lang, theme, viewport }))
  )
)

/** Synthetic UI-only response. It contains no secret, ciphertext, real provider, or tenant data. */
const CONFIG = {
  enabled: true,
  issuer: 'https://identity.example.test',
  client_id: 'ezswm-palette-fixture',
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

const COPY = {
  en: {
    settings: 'Settings',
    authTab: 'Authentication',
    callbackUrl: 'Registered callback URL',
    callbackHint: 'Add this exact URL to the allowed redirect URLs in your identity provider.',
    copyCallback: 'Copy URL',
    groupsSection: 'Scopes and group access',
    groupsHint: 'Match the group values in the identity token to ezSWM roles. Group names are entered manually; observed values are suggestions only.',
    adminGroups: 'Admin groups',
    viewerGroups: 'Viewer groups',
    groupPlaceholder: 'Exact provider group value',
    adminWins: 'If a user matches both lists, the admin role takes precedence. Group matching is exact.',
    savedEnabled: 'Saved setting: enabled',
    saveConfiguration: 'Save configuration'
  },
  de: {
    settings: 'Einstellungen',
    authTab: 'Authentifizierung',
    callbackUrl: 'Registrierte Callback-URL',
    callbackHint: 'Fügen Sie diese exakte URL bei Ihrem Identitätsanbieter zu den erlaubten Weiterleitungs-URLs hinzu.',
    copyCallback: 'URL kopieren',
    groupsSection: 'Berechtigungen und Gruppen',
    groupsHint: 'Ordnen Sie Gruppenwerte im Identitätstoken den ezSWM-Rollen zu. Gruppennamen werden manuell eingetragen; beobachtete Werte sind nur Vorschläge.',
    adminGroups: 'Admin-Gruppen',
    viewerGroups: 'Viewer-Gruppen',
    groupPlaceholder: 'Exakter Gruppenwert des Anbieters',
    adminWins: 'Wenn eine Person in beiden Listen vorkommt, hat die Admin-Rolle Vorrang. Gruppen werden exakt abgeglichen.',
    savedEnabled: 'Gespeicherte Einstellung: aktiviert',
    saveConfiguration: 'Konfiguration speichern'
  }
} as const

type Lang = keyof typeof COPY
type Theme = 'dark' | 'light'
type Rgba = [number, number, number, number]

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

async function selectLanguage(page: Page, lang: Lang) {
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English', exact: true }).click()
}

async function readLanguage(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const response = await request.get('/api/auth/me')
  if (!response.ok()) return ''
  return ((await response.json()) as { language?: string }).language ?? ''
}

function isOwnLanguageUpdate(method: string, pathname: string, postData: string | null | undefined, ownUserId: string): boolean {
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

async function setTheme(page: Page, theme: Theme) {
  const wantsDark = theme === 'dark'
  const root = page.locator('html')
  if (await root.evaluate(el => el.classList.contains('dark')) !== wantsDark) {
    await page.getByRole('button', { name: wantsDark ? 'Switch to dark mode' : 'Switch to light mode', exact: true }).click()
  }
  await expect.poll(() => root.evaluate(el => el.classList.contains('dark'))).toBe(wantsDark)

  let previous = ''
  let stable = 0
  await expect.poll(async () => {
    const current = await page.evaluate(() => `${getComputedStyle(document.body).backgroundColor}|${getComputedStyle(document.documentElement).getPropertyValue('--ui-bg-muted')}`)
    stable = current === previous ? stable + 1 : 0
    previous = current
    return stable
  }, { message: 'theme token render settled' }).toBeGreaterThanOrEqual(3)
}

async function readThemeTokens(page: Page) {
  const raw = await page.evaluate(() => {
    const probe = document.createElement('span')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:fixed;left:-10000px;top:0;display:block;visibility:hidden;pointer-events:none'
    document.body.append(probe)

    const color = (property: 'background-color' | 'color', value: string) => {
      probe.style.removeProperty('background-color')
      probe.style.removeProperty('color')
      probe.style.setProperty(property, value)
      return getComputedStyle(probe).getPropertyValue(property)
    }

    try {
      return {
        elevated: color('background-color', 'var(--ui-bg-elevated)'),
        elevatedHalf: color('background-color', 'color-mix(in oklab, var(--ui-bg-elevated) 50%, transparent)'),
        muted: color('background-color', 'var(--ui-bg-muted)'),
        textMuted: color('color', 'var(--ui-text-muted)'),
        textHighlighted: color('color', 'var(--ui-text-highlighted)'),
        borderAccented: color('color', 'var(--ui-border-accented)'),
        primary: color('background-color', 'var(--ui-primary)'),
        textInverted: color('color', 'var(--ui-text-inverted)')
      }
    } finally {
      probe.remove()
    }
  })

  const names = Object.keys(raw) as (keyof typeof raw)[]
  const colors = await normalizeColors(page, names.map(name => raw[name]))
  return Object.fromEntries(names.map((name, index) => [name, colors[index]!])) as Record<keyof typeof raw, Rgba>
}

async function normalizeColors(page: Page, cssColors: string[]): Promise<Rgba[]> {
  return page.evaluate((values) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas 2D context is unavailable')

    return values.map((value) => {
      if (!CSS.supports('color', value)) throw new Error('A computed palette color could not be parsed')
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      return Array.from(context.getImageData(0, 0, 1, 1).data) as Rgba
    })
  }, cssColors)
}

async function readComputedColor(locator: Locator, property: 'background-color' | 'color') {
  return locator.evaluate((element, styleProperty) => getComputedStyle(element).getPropertyValue(styleProperty), property)
}

function extractCssColors(value: string): string[] {
  const functionName = /(?<![\w-])(?:rgba?|hsla?|oklab|oklch|lab|lch|color(?:-mix)?)\s*\(/ig
  const colors: string[] = []
  let match: RegExpExecArray | null

  while ((match = functionName.exec(value)) !== null) {
    const open = value.indexOf('(', match.index)
    let depth = 0
    let quote = ''
    let escaped = false
    let end = -1

    for (let index = open; index < value.length; index++) {
      const character = value[index]!
      if (quote) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === quote) quote = ''
        continue
      }
      if (character === '"' || character === "'") {
        quote = character
        continue
      }
      if (character === '(') depth++
      else if (character === ')') {
        depth--
        if (depth === 0) {
          end = index
          break
        }
      }
    }

    if (end < 0) throw new Error('Unbalanced CSS color function in computed alert ring')
    colors.push(value.slice(match.index, end + 1))
    // The captured outer color already contains any nested color functions.
    functionName.lastIndex = end + 1
  }

  return colors
}

function assertCssColorExtractorContract() {
  const nestedMix = 'color-mix(in oklab, color(srgb 0.2 0.3 0.4 / 0.5) 25%, transparent)'
  const fixture = [
    'rgb(1 2 3) 0px 0px 0px',
    'rgba(4, 5, 6, 0.5) 0px 0px 1px',
    'hsl(7 8% 9%) 0px 0px 1px',
    'hsla(10, 20%, 30%, 0.4) 0px 0px 1px',
    'oklab(0.5 0.01 0.02) 0px 0px 1px',
    'oklch(0.5 0.1 120) 0px 0px 1px',
    'lab(50% 10 20) 0px 0px 1px',
    'lch(50% 20 120) 0px 0px 1px',
    'color(display-p3 0.2 0.3 0.4) 0px 0px 1px',
    `${nestedMix} 0px 0px 1px`
  ].join(', ')
  const colors = extractCssColors(fixture)
  if (colors.length !== 10 || colors[9] !== nestedMix || extractCssColors('none').length !== 0) {
    throw new Error('CSS color extractor self-check failed')
  }
}

assertCssColorExtractorContract()

async function readRingColors(page: Page, alertRoot: Locator): Promise<Rgba[]> {
  const shadow = await alertRoot.evaluate(element => getComputedStyle(element).boxShadow)
  const colors = extractCssColors(shadow)
  return normalizeColors(page, colors)
}

function expectSameColor(actual: Rgba, expected: Rgba, label: string) {
  for (let channel = 0; channel < 4; channel++) {
    expect(Math.abs(actual[channel]! - expected[channel]!), `${label}: channel ${channel} matches the semantic token`).toBeLessThanOrEqual(1)
  }
}

function expectAchromatic(color: Rgba, label: string) {
  expect(Math.abs(color[0] - color[1]), `${label}: red and green channels`).toBeLessThanOrEqual(1)
  expect(Math.abs(color[1] - color[2]), `${label}: green and blue channels`).toBeLessThanOrEqual(1)
}

async function expectHorizontalFit(page: Page, locator: Locator, label: string) {
  const viewport = page.viewportSize()!
  const box = await locator.boundingBox()
  expect(box, `${label} has a rendered box`).not.toBeNull()
  expect(box!.x, `${label} begins inside the viewport`).toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width, `${label} ends inside the viewport`).toBeLessThanOrEqual(viewport.width + 1)
}

async function capture(locator: Locator, filename: string) {
  if (!SHOTS) throw new Error('AUTH_NEUTRAL_SHOTS_DIR must point to the private capture directory')
  mkdirSync(SHOTS, { recursive: true, mode: 0o700 })
  await locator.scrollIntoViewIfNeeded()
  await expect(locator).toBeVisible()
  await locator.screenshot({ path: join(SHOTS, filename) })
}

test.describe('OIDC authentication palette', () => {
  for (const { lang, theme, viewport } of MATRIX) {
    test(`${lang}-${theme}-${viewport}: semantic neutral information surfaces and preserved primary action`, async ({ page, request, baseURL }) => {
      expect(baseURL, 'palette evidence must use only the owned isolated candidate').toBe(CANDIDATE_BASE)
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
      watchStrictErrors(page, errors)

      page.on('request', (browserRequest) => {
        const url = new URL(browserRequest.url())
        if (!url.pathname.startsWith('/api/') || browserRequest.method() === 'GET') return
        if (isOwnLanguageUpdate(browserRequest.method(), url.pathname, browserRequest.postData(), ownUserId)) {
          languageWrites++
        }
      })

      await page.route('**/api/**', async (route) => {
        const browserRequest = route.request()
        if (browserRequest.method() === 'GET') return route.fallback()
        const url = new URL(browserRequest.url())
        if (isOwnLanguageUpdate(browserRequest.method(), url.pathname, browserRequest.postData(), ownUserId)) return route.fallback()
        forbiddenWrites.push('unexpected mutating API request blocked')
        return route.abort()
      })

      await page.route('**/api/auth/oidc/config', async (route) => {
        if (route.request().method() !== 'GET') {
          configMutations++
          forbiddenWrites.push('unexpected mutating API request blocked')
          return route.abort()
        }
        configGets++
        return json(route, CONFIG)
      })

      try {
        await page.goto('/')
        await expect(page.locator('main h1').first()).toBeVisible()
        // The hydrated theme control is used only as a bounded public UI readiness proxy.
        await expect(page.getByRole('button', { name: /^Switch to (light|dark) mode$/ })).toBeVisible()
        if (lang === 'de') {
          await selectLanguage(page, 'de')
          await expect.poll(() => readLanguage(request), { message: 'supported header language update reached the fixture profile' }).toBe('de')
        }
        await setTheme(page, theme)

        await page.goto('/settings')
        await expect(page.locator('main h1').first()).toHaveText(COPY[lang].settings)
        const authTab = page.getByRole('tab', { name: COPY[lang].authTab, exact: true })
        await expect(authTab).toBeVisible()
        await authTab.click()
        await expect(page.getByRole('heading', { level: 2, name: COPY[lang].authTab, exact: true })).toBeVisible()
        await expect(page.getByText(COPY[lang].savedEnabled, { exact: true })).toBeVisible()
        await expect.poll(() => configGets, { message: 'synthetic OIDC config GET loaded' }).toBeGreaterThan(0)

        const groupsHeading = page.getByRole('heading', { name: COPY[lang].groupsSection, exact: true })
        const groupsSection = groupsHeading.locator('xpath=../../..')
        const groupsIconTile = groupsHeading.locator('xpath=../..').locator('xpath=./div[1]')
        const groupsHint = page.getByText(COPY[lang].groupsHint, { exact: true })
        const callbackHint = page.getByText(COPY[lang].callbackHint, { exact: true })
        const callbackPanel = callbackHint.locator('xpath=..')
        const callbackInput = page.locator('input[readonly]')
        const alertDescription = page.getByText(COPY[lang].adminWins, { exact: true })
        const alertRoot = alertDescription.locator('xpath=ancestor::*[@data-slot="root"][1]')
        const primaryAction = page.getByRole('button', { name: COPY[lang].saveConfiguration, exact: true })

        await expect(groupsHeading).toBeVisible()
        await expect(groupsHint).toHaveCount(1)
        await expect(callbackInput).toHaveCount(1)
        await expect(callbackInput).toHaveAttribute('readonly', '')
        await expect(callbackInput).toHaveAccessibleName(COPY[lang].callbackUrl)
        await expect(callbackInput).toHaveValue(CONFIG.callback_url)
        await expect(page.getByRole('button', { name: COPY[lang].copyCallback, exact: true })).toBeVisible()
        await expect(alertRoot).toHaveCount(1)
        await expect(alertRoot).toHaveAttribute('data-slot', 'root')
        await expect(alertRoot).toHaveAttribute('data-orientation', 'vertical')
        // Installed Nuxt UI Alert.vue renders this slot root without an implicit role.
        expect(await alertRoot.getAttribute('role')).toBeNull()
        await expect(alertRoot.locator('[data-slot="description"]')).toHaveText(COPY[lang].adminWins)
        await expect(page.getByPlaceholder(COPY[lang].groupPlaceholder).nth(0)).toHaveValue('fixture-admins')
        await expect(page.getByPlaceholder(COPY[lang].groupPlaceholder).nth(1)).toHaveValue('fixture-viewers')
        await expect(primaryAction).toBeVisible()
        await expect(primaryAction).toBeDisabled()

        const tokens = await readThemeTokens(page)
        const rawColors = await Promise.all([
          readComputedColor(groupsIconTile, 'background-color'),
          readComputedColor(groupsIconTile, 'color'),
          readComputedColor(groupsHint, 'color'),
          readComputedColor(callbackPanel, 'background-color'),
          readComputedColor(callbackHint, 'color'),
          readComputedColor(alertRoot, 'background-color'),
          readComputedColor(alertRoot, 'color'),
          readComputedColor(alertRoot.locator('[data-slot="description"]'), 'color'),
          readComputedColor(primaryAction, 'background-color'),
          readComputedColor(primaryAction, 'color')
        ])
        const actual = await normalizeColors(page, rawColors)

        expectSameColor(actual[0]!, tokens.elevated, 'Groups icon background uses bg-elevated')
        expectSameColor(actual[1]!, tokens.textMuted, 'Groups icon uses text-muted')
        expectSameColor(actual[2]!, tokens.textMuted, 'Groups hint uses text-muted')
        expectSameColor(actual[3]!, tokens.muted, 'Callback panel uses bg-muted')
        expectSameColor(actual[4]!, tokens.textMuted, 'Callback helper uses text-muted')
        expectSameColor(actual[5]!, tokens.elevatedHalf, 'Neutral alert uses the elevated half-opacity surface')
        expectSameColor(actual[6]!, tokens.textHighlighted, 'Neutral alert inherits highlighted text')
        expectSameColor(actual[7]!, tokens.textHighlighted, 'Alert description inherits highlighted text')
        expectSameColor(actual[8]!, tokens.primary, 'Primary action retains the configured green token')
        expectSameColor(actual[9]!, tokens.textInverted, 'Primary action retains inverted text')

        for (const [name, color] of [
          ['elevated', tokens.elevated],
          ['muted', tokens.muted],
          ['text-muted', tokens.textMuted],
          ['highlighted', tokens.textHighlighted],
          ['accented border', tokens.borderAccented],
          ['alert elevated surface', tokens.elevatedHalf],
          ['groups icon surface', actual[0]!],
          ['groups hint', actual[2]!],
          ['callback surface', actual[3]!],
          ['callback helper', actual[4]!],
          ['alert description', actual[7]!]
        ] as const) {
          expectAchromatic(color, name)
        }

        const ringColors = await readRingColors(page, alertRoot)
        expect(ringColors.length, 'neutral subtle alert renders a ring').toBeGreaterThan(0)
        expect(ringColors.some(color => color.every((channel, index) => Math.abs(channel - tokens.borderAccented[index]!) <= 1)), 'alert ring resolves to border-accented').toBe(true)
        for (const ring of ringColors) expectAchromatic(ring, 'neutral alert ring')

        await expectHorizontalFit(page, callbackPanel, 'Callback panel')
        await expectHorizontalFit(page, groupsSection, 'Groups section')
        await expectHorizontalFit(page, alertRoot, 'Admin-wins notice')
        await expect(callbackHint).toHaveCSS('overflow-x', 'visible')
        const textMetrics = await Promise.all([
          groupsHint.evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight })),
          callbackHint.evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight })),
          alertRoot.locator('[data-slot="description"]').evaluate(el => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }))
        ])
        for (const [label, size] of [['Groups hint', textMetrics[0]!], ['Callback helper', textMetrics[1]!], ['Admin-wins copy', textMetrics[2]!]] as const) {
          expect(size.scrollWidth, `${label} has no clipped horizontal text`).toBeLessThanOrEqual(size.clientWidth + 1)
          expect(size.scrollHeight, `${label} has no clipped vertical text`).toBeLessThanOrEqual(size.clientHeight + 1)
        }
        const overflow = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          body: document.body.scrollWidth <= document.body.clientWidth + 1,
          main: (() => {
            const main = document.querySelector('#main-content')
            return !main || main.scrollWidth <= main.clientWidth + 1
          })()
        }))
        expect(overflow, 'no horizontal page or main-content overflow').toEqual({ document: true, body: true, main: true })

        await capture(callbackPanel, `oidc-palette-${lang}-${theme}-${viewport}-callback.png`)
        await capture(groupsSection, `oidc-palette-${lang}-${theme}-${viewport}-groups.png`)
      } finally {
        if (lang === 'de') {
          await selectLanguage(page, 'en')
          await expect(page.locator('main h1').first()).toHaveText(COPY.en.settings)
        }
        await expect.poll(() => readLanguage(request), { message: 'fixture admin language restored to English' }).toBe('en')
      }

      expect(configMutations, 'no OIDC config writes or checks are attempted').toBe(0)
      expect(forbiddenWrites, 'only the supported header language update may write').toEqual([])
      expect(languageWrites, 'only EN/DE fixture language changes were written').toBe(lang === 'de' ? 2 : 0)
      expect(errors, 'strict browser console and page-error guard').toEqual([])
    })
  }
})
