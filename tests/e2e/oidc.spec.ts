import { test as base, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Bounded OIDC/SSO e2e checks. Run ONLY against an isolated dev server (never real data).
 *  - Login page tests mock `GET /api/auth/oidc/status`; no IdP is contacted.
 *  - Admin settings tests mock the admin OIDC endpoints; nothing is persisted.
 *  - The viewer spot check creates (and removes) one throw-away local viewer through the API.
 */

/** Strip query strings / long opaque tokens so logged console text cannot carry credentials. */
const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)

/** Console errors + uncaught page errors seen on a page. */
function watch(page: Page, sink: string[]) {
  page.on('console', (m) => { if (m.type() === 'error') sink.push(`console: ${redact(m.text())}`) })
  page.on('pageerror', e => sink.push(`pageerror: ${redact(e.message)}`))
}

/**
 * Every test fails on unexpected browser console errors / page errors (logged redacted as an
 * attachment). Tests that INTENTIONALLY provoke a failing request declare it with
 * `test.info().annotations.push({ type: 'expect-console', description: '<regex>' })`.
 */
const test = base.extend<{ consoleGuard: undefined }>({
  consoleGuard: [async ({ page }, use, testInfo) => {
    const seen: string[] = []
    watch(page, seen)
    await use(undefined)
    const allowed = testInfo.annotations.filter(a => a.type === 'expect-console').map(a => new RegExp(a.description ?? '^$'))
    const unexpected = seen.filter(m => !allowed.some(re => re.test(m)))
    await testInfo.attach('browser-console.txt', { body: seen.length ? seen.join('\n') : '(no console errors or page errors)', contentType: 'text/plain' })
    expect(unexpected, 'unexpected browser console/page errors').toEqual([])
  }, { auto: true }]
})

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const CONFIG = {
  enabled: false,
  issuer: null,
  client_id: null,
  client_secret_configured: false,
  scopes: ['openid', 'profile'],
  groups_claim: 'groups',
  admin_groups: [],
  viewer_groups: [],
  allow_unmatched_viewer: false,
  allow_http_issuer: false,
  observed_groups: ['ops', 'netadmins'],
  provider_name: null,
  config_revision: 3,
  updated_at: '2026-01-01T00:00:00.000Z',
  callback_url: 'http://localhost:3000/api/auth/oidc/callback',
  encryption_key_ready: true,
  secret_decryptable: true
}

test.describe('Login page SSO visibility', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('SSO button is hidden when SSO is disabled; local form stays', async ({ page }) => {
    await page.route('**/api/auth/oidc/status', route => json(route, { enabled: false }))
    await page.goto('/login')
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('a[href="/api/auth/oidc/start"]')).toHaveCount(0)
  })

  test('SSO button is shown when enabled and local form remains available', async ({ page }) => {
    await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true }))
    await page.goto('/login')
    const sso = page.locator('a[href="/api/auth/oidc/start"]')
    await expect(sso).toBeVisible()
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('a safe oidc_error code renders a message; unknown codes render nothing', async ({ page }) => {
    await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true }))
    await page.goto('/login?oidc_error=oidc_access_denied')
    await expect(page.locator('body')).toContainText(/does not currently have access|hat derzeit keinen Zugriff|Zugriff/i)
    await page.goto('/login?oidc_error=<script>alert(1)</script>')
    await expect(page.locator('body')).not.toContainText('alert(1)')
  })

  test('status endpoint failure keeps the login page usable without SSO', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-console', description: 'Failed to load resource|500' })
    await page.route('**/api/auth/oidc/status', route => json(route, { error: 'x' }, 500))
    await page.goto('/login')
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('a[href="/api/auth/oidc/start"]')).toHaveCount(0)
  })
})

test.describe('Admin settings: Authentication tab (mocked endpoints)', () => {
  test('secret is only sent when typed; saved secret is never displayed', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await page.route('**/api/auth/oidc/config', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as Record<string, unknown>
        puts.push(body)
        return json(route, { ...CONFIG, ...body, client_secret: undefined, client_secret_configured: true, config_revision: 4 })
      }
      return json(route, CONFIG)
    })
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Authentication|Authentifizierung/ }).click()

    await expect(page.locator('input[readonly]').first()).toHaveValue(/\/api\/auth\/oidc\/callback$/)
    await page.getByPlaceholder('https://id.example.org').fill('https://idp.example.com')
    // Scope to the page content: the global header search input also uses autocomplete=off.
    await page.getByLabel(/^Client ID|^Client-ID/).fill('my-client')
    await page.locator('input[type="password"][autocomplete="new-password"]').fill('super-secret-value')
    await page.getByRole('button', { name: /Save configuration|Konfiguration speichern/ }).click()

    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]).toMatchObject({ issuer: 'https://idp.example.com', client_id: 'my-client', client_secret: 'super-secret-value' })
    // The secret must not be rendered back anywhere after saving.
    await expect(page.locator('body')).not.toContainText('super-secret-value')
    await expect(page.locator('input[type="password"][autocomplete="new-password"]')).toHaveValue('')
  })

  test('the check button is a POST to the saved-config check; no login is started', async ({ page }) => {
    let checks = 0
    await page.route('**/api/auth/oidc/config', route => json(route, { ...CONFIG, issuer: 'https://idp.example.com', client_id: 'c' }))
    await page.route('**/api/auth/oidc/check', (route) => {
      checks++
      expect(route.request().method()).toBe('POST')
      return json(route, { ok: true, issuer: 'https://idp.example.com', token_endpoint_auth_method: 'client_secret_basic', id_token_alg: 'RS256', endpoints: { authorization: true, token: true, jwks: true, userinfo: true } })
    })
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Authentication|Authentifizierung/ }).click()
    await page.getByRole('button', { name: /Check connection|Verbindung prüfen/ }).click()
    await expect.poll(() => checks).toBe(1)
  })
})

test.describe('Viewer: read-only account, server-enforced 403', () => {
  const username = `e2e_viewer_${Date.now().toString(36)}`
  const password = 'viewer-password-123'
  let viewerId = ''

  test.beforeAll(async ({ request }) => {
    const created = await request.post('/api/users', {
      data: { username, display_name: 'E2E Viewer', password, role: 'viewer', language: 'en' }
    })
    expect(created.ok()).toBe(true)
    viewerId = ((await created.json()) as { id: string }).id
  })

  test.afterAll(async ({ request }) => {
    if (viewerId) await request.delete(`/api/users/${viewerId}`)
  })

  test('viewer gets 403 on admin-only APIs and writes, and sees no Authentication tab', async ({ playwright, browser, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL: baseURL ?? 'http://localhost:3000' })
    const login = await api.post('/api/auth/login', { data: { username, password } })
    expect(login.ok()).toBe(true)

    expect((await api.get('/api/auth/oidc/config')).status()).toBe(403)
    expect((await api.put('/api/auth/oidc/config', { data: { enabled: true } })).status()).toBe(403)
    expect((await api.post('/api/auth/oidc/check')).status()).toBe(403)
    expect((await api.get('/api/users')).status()).toBe(403)
    expect((await api.get('/api/backup/export')).status()).toBe(403)
    expect((await api.post('/api/sites', { data: { name: 'viewer-should-not-create' } })).status()).toBe(403)
    // Reads remain allowed, and the inventory export carries no users.
    expect((await api.get('/api/sites')).status()).toBe(200)
    const inv = await api.get('/api/data/export')
    expect(inv.status()).toBe(200)
    expect(JSON.stringify(await inv.json())).not.toContain('password_hash')
    // Own profile: display name/language only.
    expect((await api.put(`/api/users/${viewerId}`, { data: { role: 'admin' } })).status()).toBe(400)
    expect((await api.put(`/api/users/${viewerId}`, { data: { display_name: 'E2E Viewer 2' } })).status()).toBe(200)

    const ctx = await browser.newContext({ storageState: await api.storageState(), baseURL: baseURL ?? 'http://localhost:3000' })
    const page = await ctx.newPage()
    const seen: string[] = []
    watch(page, seen)
    await page.goto('/settings')
    await expect(page.locator('h1')).toContainText(/Settings|Einstellungen/)
    await expect(page.getByRole('tab', { name: /Authentication|Authentifizierung/ })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: /Account|Konto/ })).toBeVisible()
    await ctx.close()
    await api.dispose()
    expect(seen, 'unexpected browser console/page errors (viewer page)').toEqual([])
  })
})

/** 64 unbroken characters (no spaces): worst case for the sign-in label on a narrow viewport. */
const LONG_NAME = 'Saar'.repeat(16)
const HTML_NAME = '<img src=x onerror="window.__xss=1"><b>Saar</b>'

/** True when neither the document nor the body scrolls horizontally. */
const noPageOverflow = (page: Page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  && document.body.scrollWidth <= document.body.clientWidth + 1)

/**
 * Provider display-name branding. Status/config responses are MOCKED (these assert the UI contract
 * only; they do not exercise a real OAuth flow or real persistence).
 */
test.describe('Login page provider name (mocked status)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  const sso = (page: Page) => page.locator('a[href="/api/auth/oidc/start"]')

  for (const [lang, locale, branded, generic] of [
    ['en', 'en-US', 'Sign in with SaarAuth', 'Continue with your organization'],
    ['de', 'de-DE', 'Mit SaarAuth anmelden', 'Mit dem Organisationskonto fortfahren']
  ] as const) {
    test(`custom name is used in the ${lang.toUpperCase()} label; missing/blank/non-string fall back to the generic text`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, locale, storageState: { cookies: [], origins: [] } })
      const page = await ctx.newPage()
      const seen: string[] = []
      watch(page, seen)
      let status: unknown = { enabled: true, provider_name: 'SaarAuth' }
      await page.route('**/api/auth/oidc/status', route => json(route, status))
      await page.goto('/login')
      await expect(sso(page)).toHaveText(branded)
      await expect(page.locator('input[autocomplete="username"]')).toBeVisible()

      for (const fallback of [{ enabled: true }, { enabled: true, provider_name: '' }, { enabled: true, provider_name: '   ' }, { enabled: true, provider_name: 42 }, { enabled: true, provider_name: null }]) {
        status = fallback
        await page.goto('/login')
        await expect(sso(page)).toHaveText(generic)
        await expect(sso(page)).not.toContainText('SaarAuth')
      }
      // Branding is only meaningful while SSO is enabled.
      status = { enabled: false }
      await page.goto('/login')
      await expect(sso(page)).toHaveCount(0)
      await ctx.close()
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }

  test('HTML-looking name is rendered as plain text (no DOM injection, no script execution)', async ({ page }) => {
    await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true, provider_name: HTML_NAME }))
    await page.goto('/login')
    await expect(sso(page)).toBeVisible()
    await expect(sso(page)).toContainText(HTML_NAME)
    await expect(sso(page).locator('img, b, script')).toHaveCount(0)
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  })

  for (const locale of ['en-US', 'de-DE'] as const) {
    test(`64 unbroken characters do not overflow a 320px mobile viewport (${locale})`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, locale, viewport: { width: 320, height: 640 }, storageState: { cookies: [], origins: [] } })
      const page = await ctx.newPage()
      await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true, provider_name: LONG_NAME }))
      await page.goto('/login')
      await expect(sso(page)).toContainText(LONG_NAME)
      // Local form first: submit precedes the long-named SSO link in DOM order and by y position.
      const submit = page.locator('form button[type="submit"]')
      await expect(submit).toBeVisible()
      const submitHandle = await submit.elementHandle()
      expect(await sso(page).evaluate((link, sub) => !!(sub!.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING), submitHandle), 'local submit before SSO link in DOM').toBe(true)
      const [sb, lb] = await Promise.all([submit.boundingBox(), sso(page).boundingBox()])
      expect(sb!.y + sb!.height, 'local submit above SSO link').toBeLessThanOrEqual(lb!.y + 1)
      expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
      const [btn, vp] = await Promise.all([sso(page).boundingBox(), page.viewportSize()])
      expect(btn!.x).toBeGreaterThanOrEqual(0)
      expect(btn!.x + btn!.width).toBeLessThanOrEqual(vp!.width + 1)
      const clipped = await sso(page).evaluate(el => el.scrollWidth > el.clientWidth + 1)
      expect(clipped, 'button content wider than the button').toBe(false)
      await ctx.close()
    })
  }

  test('local form and status-failure fallback are unchanged', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-console', description: 'Failed to load resource|500' })
    await page.route('**/api/auth/oidc/status', route => json(route, { error: 'x' }, 500))
    await page.goto('/login')
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(sso(page)).toHaveCount(0)
  })
})

/**
 * Login ordering contract (mocked status; no IdP, no real credentials): the local form comes first, the
 * SSO link last. Asserted on the real DOM order AND on rendered y geometry, in EN/DE, on desktop and a
 * 320px phone, for the generic and a custom provider label. A safe oidc_error alert stays ABOVE the form.
 */
test.describe('Login page order: local form first, SSO link last (mocked status)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  const SSO_HREF = 'a[href="/api/auth/oidc/start"]'
  const LOGIN_LOCALES = {
    en: { locale: 'en-US', generic: 'Continue with your organization', branded: 'Sign in with SaarAuth', divider: 'or', hint: 'Local administrator sign-in remains available for recovery.', denied: /does not currently have access/ },
    de: { locale: 'de-DE', generic: 'Mit dem Organisationskonto fortfahren', branded: 'Mit SaarAuth anmelden', divider: 'oder', hint: 'Die lokale Anmeldung für Administratoren bleibt zur Wiederherstellung verfügbar.', denied: /Ihr Konto hat derzeit keinen Zugriff/ }
  } as const
  const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } } as const

  async function openLogin(browser: import('@playwright/test').Browser, baseURL: string | undefined, lang: keyof typeof LOGIN_LOCALES, viewport: { width: number, height: number }, status: unknown, query = '', statusCode = 200, allow?: { status: number, path: string }) {
    const ctx = await browser.newContext({ baseURL, locale: LOGIN_LOCALES[lang].locale, viewport, storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    const seen: string[] = []
    // Only the deliberate failed-resource console error (exact HTTP status on the exact mocked path) is
    // set aside and counted in `expected`; every other console error and every page error stays in `seen`.
    const expected: string[] = []
    page.on('console', (m) => {
      if (m.type() !== 'error') return
      const isDeliberate = !!allow
        && m.text().startsWith(`Failed to load resource: the server responded with a status of ${allow.status}`)
        && new URL(m.location().url, 'http://x').pathname === allow.path
      ;(isDeliberate ? expected : seen).push(`console: ${redact(m.text())}`)
    })
    page.on('pageerror', e => seen.push(`pageerror: ${redact(e.message)}`))
    await page.route('**/api/auth/oidc/status', route => json(route, status, statusCode))
    await page.goto(`/login${query}`)
    return { ctx, page, seen, expected }
  }
  const submitBtn = (page: Page) => page.locator('form button[type="submit"]')
  /** True when `a` precedes `b` in document order. */
  const precedes = async (a: import('@playwright/test').Locator, b: import('@playwright/test').Locator) => {
    const handle = await b.elementHandle()
    return a.evaluate((x, y) => !!(x.compareDocumentPosition(y as Node) & Node.DOCUMENT_POSITION_FOLLOWING), handle)
  }

  for (const lang of ['en', 'de'] as const) {
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      for (const variant of ['generic', 'custom'] as const) {
        test(`local form precedes the SSO link in DOM and geometry, hint + divider between (${lang}, ${vpName}, ${variant})`, async ({ browser, baseURL }) => {
          const T = LOGIN_LOCALES[lang]
          const { ctx, page, seen } = await openLogin(browser, baseURL, lang, viewport, variant === 'custom' ? { enabled: true, provider_name: 'SaarAuth' } : { enabled: true })
          const link = page.locator(SSO_HREF)
          await expect(link).toHaveText(variant === 'custom' ? T.branded : T.generic)
          const username = page.locator('input[autocomplete="username"]')
          const password = page.locator('input[type="password"]')
          const submit = submitBtn(page)
          await expect(submit).toBeVisible()
          await expect(page.getByText(T.hint, { exact: true })).toBeVisible()
          await expect(page.getByText(T.divider, { exact: true })).toHaveCount(1)

          // DOM order: username -> password -> submit -> SSO link.
          expect(await precedes(username, password), 'username before password in DOM').toBe(true)
          expect(await precedes(password, submit), 'password before local submit in DOM').toBe(true)
          expect(await precedes(submit, link), 'local submit before SSO link in DOM').toBe(true)
          // The link is NOT inside the local form.
          await expect(page.locator(`form ${SSO_HREF}`)).toHaveCount(0)

          // Rendered geometry: same top-to-bottom order, no overlap.
          const [u, p, s, l, hint, div] = await Promise.all([
            username.boundingBox(), password.boundingBox(), submit.boundingBox(), link.boundingBox(),
            page.getByText(T.hint, { exact: true }).boundingBox(), page.getByText(T.divider, { exact: true }).boundingBox()
          ])
          expect(u!.y + u!.height).toBeLessThanOrEqual(p!.y + 1)
          expect(p!.y + p!.height).toBeLessThanOrEqual(s!.y + 1)
          expect(s!.y + s!.height, 'submit bottom above SSO link top').toBeLessThanOrEqual(l!.y + 1)
          expect(hint!.y, 'recovery hint after local submit').toBeGreaterThanOrEqual(s!.y + s!.height - 1)
          expect(hint!.y + hint!.height, 'recovery hint before SSO link').toBeLessThanOrEqual(l!.y + 1)
          expect(div!.y, 'divider after local submit').toBeGreaterThanOrEqual(s!.y + s!.height - 1)
          expect(div!.y + div!.height, 'divider before SSO link').toBeLessThanOrEqual(l!.y + 1)
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
          await ctx.close()
          expect(seen, 'unexpected browser console/page errors').toEqual([])
        })
      }
    }

    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      test(`safe oidc_error alert is above the local form and the SSO link (${lang}, ${vpName})`, async ({ browser, baseURL }) => {
        const T = LOGIN_LOCALES[lang]
        const { ctx, page, seen } = await openLogin(browser, baseURL, lang, viewport, { enabled: true }, '?oidc_error=oidc_access_denied')
        const link = page.locator(SSO_HREF)
        await expect(link).toBeVisible()
        const alert = page.getByText(T.denied)
        await expect(alert).toBeVisible()
        const username = page.locator('input[autocomplete="username"]')
        expect(await precedes(alert, username), 'error before form in DOM').toBe(true)
        expect(await precedes(alert, link), 'error before SSO link in DOM').toBe(true)
        expect(await precedes(submitBtn(page), link), 'local submit before SSO link in DOM').toBe(true)
        const [a, u, s, l] = await Promise.all([alert.boundingBox(), username.boundingBox(), submitBtn(page).boundingBox(), link.boundingBox()])
        expect(a!.y + a!.height, 'error above form').toBeLessThanOrEqual(u!.y + 1)
        expect(s!.y + s!.height, 'submit above SSO link').toBeLessThanOrEqual(l!.y + 1)
        await ctx.close()
        expect(seen, 'unexpected browser console/page errors').toEqual([])
      })
    }

    for (const [label, status, code] of [['SSO disabled', { enabled: false }, 200], ['status endpoint 500', { error: 'x' }, 500]] as const) {
      test(`divider and recovery hint are absent when ${label} (${lang})`, async ({ browser, baseURL }) => {
        const T = LOGIN_LOCALES[lang]
        const { ctx, page, seen, expected } = await openLogin(browser, baseURL, lang, VIEWPORTS.desktop, status, '', code, code === 500 ? { status: 500, path: '/api/auth/oidc/status' } : undefined)
        await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
        await expect(submitBtn(page)).toBeVisible()
        // Give the onMounted status request time to settle before asserting absence.
        await page.waitForLoadState('networkidle')
        await expect(page.locator(SSO_HREF)).toHaveCount(0)
        await expect(page.getByText(T.hint, { exact: true })).toHaveCount(0)
        await expect(page.getByText(T.divider, { exact: true })).toHaveCount(0)
        await ctx.close()
        // The 500 case intentionally provokes failed loads (GET may be retried) of the status endpoint only.
        if (code === 500) expect(expected.length, 'deliberate status-500 resource error observed').toBeGreaterThanOrEqual(1)
        else expect(expected, 'no deliberate errors expected').toEqual([])
        expect(seen, 'unexpected browser console/page errors').toEqual([])
      })
    }

    test(`keyboard order: username, password, remember, local submit, then SSO link (${lang})`, async ({ browser, baseURL }) => {
      const { ctx, page, seen } = await openLogin(browser, baseURL, lang, VIEWPORTS.desktop, { enabled: true })
      const link = page.locator(SSO_HREF)
      await expect(link).toBeVisible()
      const stops = [
        page.locator('input[autocomplete="username"]'),
        page.locator('input[type="password"]'),
        page.getByRole('checkbox'),
        submitBtn(page),
        link
      ]
      await stops[0]!.focus()
      await expect(stops[0]!).toBeFocused()
      for (const next of stops.slice(1)) {
        await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
      }
      await ctx.close()
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })

    test(`Enter in the password field submits the LOCAL login, never SSO (${lang})`, async ({ browser, baseURL }) => {
      const { ctx, page, seen, expected } = await openLogin(browser, baseURL, lang, VIEWPORTS.desktop, { enabled: true }, '', 200, { status: 401, path: '/api/auth/login' })
      const logins: unknown[] = []
      let ssoStarts = 0
      await page.route('**/api/auth/login', async (route) => {
        logins.push(route.request().postDataJSON())
        // Synthetic rejection: keeps the page on /login; nothing real is authenticated.
        await json(route, { message: 'synthetic rejection' }, 401)
      })
      await page.route('**/api/auth/oidc/start', async (route) => { ssoStarts++; await route.abort() })
      await expect(page.locator(SSO_HREF)).toBeVisible()
      await page.locator('input[autocomplete="username"]').fill('synthetic-user')
      const password = page.locator('input[type="password"]')
      await password.fill('synthetic-pass')
      await password.press('Enter')
      await expect.poll(() => logins.length, 'local login POST sent').toBe(1)
      expect(logins[0]).toEqual({ username: 'synthetic-user', password: 'synthetic-pass', remember_me: false })
      await expect(page.locator('[role="alert"]').filter({ hasText: 'synthetic rejection' })).toBeVisible()
      expect(ssoStarts, 'SSO start never requested').toBe(0)
      expect(new URL(page.url()).pathname).toBe('/login')
      await ctx.close()
      // Only the deliberate 401 failed-resource error from the mocked login is allowed (exact status + path).
      expect(expected.length, 'deliberate mocked-login 401 resource error observed').toBe(1)
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }
})

test.describe('Admin settings provider name field (mocked endpoints)', () => {
  const nameInput = (page: Page) => page.getByLabel(/^Provider display name|^Anzeigename des Anbieters/)

  async function openAuth(page: Page, config: Record<string, unknown>, puts: Record<string, unknown>[]) {
    await page.route('**/api/auth/oidc/config', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as Record<string, unknown>
        puts.push(body)
        const { client_secret: _s, client_secret_clear: _c, ...rest } = body
        return json(route, { ...config, ...rest, config_revision: 9 })
      }
      return json(route, config)
    })
    await page.goto('/settings')
    await page.getByRole('tab', { name: /Authentication|Authentifizierung/ }).click()
  }
  const save = (page: Page) => page.getByRole('button', { name: /Save configuration|Konfiguration speichern/ })

  test('field is labelled, limited to 64 characters; save sends the trimmed name', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, { ...CONFIG }, puts)
    const input = nameInput(page)
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('maxlength', '64')
    await expect(input).toHaveValue('')
    await input.fill('  SaarAuth  ')
    await save(page).click()
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]!.provider_name).toBe('SaarAuth')

    // The browser itself enforces the limit on typed input.
    await input.fill('x'.repeat(80))
    await expect(input).toHaveValue('x'.repeat(64))
  })

  test('clearing / whitespace-only name saves as null; stored name is shown on load', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, { ...CONFIG, provider_name: 'SaarAuth' }, puts)
    await expect(nameInput(page)).toHaveValue('SaarAuth')
    await nameInput(page).fill('   ')
    await save(page).click()
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]!.provider_name).toBeNull()
  })

  test('name-only save never sends client_secret / client_secret_clear when a secret is configured', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, { ...CONFIG, issuer: 'https://idp.example.com', client_id: 'c', client_secret_configured: true }, puts)
    await nameInput(page).fill('SaarAuth')
    await save(page).click()
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]).toMatchObject({ provider_name: 'SaarAuth' })
    expect(puts[0]).not.toHaveProperty('client_secret')
    expect(puts[0]).not.toHaveProperty('client_secret_clear')
    await expect(page.locator('input[type="password"][autocomplete="new-password"]')).toHaveValue('')
  })

  test('legacy config response without provider_name renders an empty field', async ({ page }) => {
    const legacy: Record<string, unknown> = { ...CONFIG }
    delete legacy.provider_name
    await openAuth(page, legacy, [])
    await expect(nameInput(page)).toHaveValue('')
  })

  test('German locale shows the translated label, hint and placeholder (header language menu)', async ({ page, request }) => {
    try {
      await openAuth(page, { ...CONFIG }, [])
      // Leave the Authentication tab context: the header menu is global.
      await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
      await page.getByRole('menuitem', { name: 'Deutsch' }).click()
      await expect(page.locator('h1')).toHaveText('Einstellungen')
      await page.getByRole('tab', { name: 'Authentifizierung' }).click()
      await expect(page.getByText('Anzeigename des Anbieters', { exact: true })).toBeVisible()
      await expect(page.getByText('Wird auf der Anmeldeschaltfläche angezeigt', { exact: false })).toBeVisible()
      await expect(page.getByPlaceholder('z. B. Unternehmens-SSO')).toBeVisible()
    } finally {
      await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
      await page.getByRole('menuitem', { name: 'English' }).click()
      await expect(page.locator('h1')).toHaveText('Settings')
      const me = await (await request.get('/api/auth/me')).json() as { language: string }
      expect(me.language, 'disposable admin language restored').toBe('en')
    }
  })

  test('a 64 unbroken character name does not overflow the German page on mobile', async ({ page, request }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    try {
      // observed_groups is emptied on purpose: the German suggestion buttons (queued group-UX task) overflow 320px independently of the name.
      await openAuth(page, { ...CONFIG, provider_name: LONG_NAME, observed_groups: [] }, [])
      await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
      await page.getByRole('menuitem', { name: 'Deutsch' }).click()
      await expect(page.locator('h1')).toHaveText('Einstellungen')
      await page.getByRole('tab', { name: 'Authentifizierung' }).click()
      await expect(nameInput(page)).toHaveValue(LONG_NAME)
      expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
      const offenders = await nameInput(page).evaluate((el) => {
        const out: string[] = []
        for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
          if (n.scrollWidth > n.clientWidth + 1) out.push(`${n.tagName.toLowerCase()} ${n.scrollWidth}>${n.clientWidth}`)
        }
        return out
      })
      expect(offenders).toEqual([])
    } finally {
      await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
      await page.getByRole('menuitem', { name: 'English' }).click()
      await expect(page.locator('h1')).toHaveText('Settings')
      const me = await (await request.get('/api/auth/me')).json() as { language: string }
      expect(me.language, 'disposable admin language restored').toBe('en')
    }
  })
})

/**
 * Group suggestion filtering + stacked layout (mocked config/PUT; UI contract only, nothing persisted,
 * no real provider). Observed groups come from the config response; the visible suggestion list is a
 * client-side filter over BOTH draft role lists (trimmed, exact, case-sensitive). Persisted history is
 * never changed by the UI, which the PUT payload assertions below verify (no observed_groups key).
 */
const GA = 'ops-alpha'
const GB = 'ops-beta'
const GC = 'ops-gamma'
const escRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const GROUP_TEXT = {
  en: {
    settings: 'Settings', authTab: /Authentication/, observed: 'Observed group suggestions', admin: 'Admin groups', viewer: 'Viewer groups',
    addAdmin: 'Add as admin', addViewer: 'Add as viewer', remove: 'Remove group', add: 'Add', save: /Save configuration/,
    // The two DISTINCT empty states (settings.oidc.observedNone / observedAllAssigned).
    noObserved: /No group values have been observed yet\./,
    allAssigned: /All observed groups are assigned\./,
    sections: ['Provider', 'Scopes and group access', 'Security', 'Provider check']
  },
  de: {
    settings: 'Einstellungen', authTab: /Authentifizierung/, observed: 'Beobachtete Gruppenvorschläge', admin: 'Admin-Gruppen', viewer: 'Viewer-Gruppen',
    addAdmin: 'Als Admin hinzufügen', addViewer: 'Als Viewer hinzufügen', remove: 'Gruppe entfernen', add: 'Hinzufügen', save: /Konfiguration speichern/,
    noObserved: /Bisher wurden keine Gruppenwerte beobachtet\./,
    allAssigned: /Alle beobachteten Gruppen sind bereits zugeordnet\./,
    sections: ['Anbieter', 'Berechtigungen und Gruppen', 'Sicherheit', 'Anbieter prüfen']
  }
} as const
type GLang = keyof typeof GROUP_TEXT

/** Walk from `selector` up to <html>; list ancestors that scroll horizontally (the input's own clipping is ignored). */
const overflowingAncestors = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => {
  const out: string[] = []
  for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 1) out.push(`${n.tagName.toLowerCase()} ${n.scrollWidth}>${n.clientWidth}`)
  }
  return out
})

test.describe('OIDC group suggestions + stacked layout (mocked endpoints)', () => {
  const baseConfig = (over: Record<string, unknown> = {}) => ({
    ...CONFIG, enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true,
    observed_groups: [GA, GB, GC], admin_groups: [GA], viewer_groups: [GB], ...over
  })

  /** Mock GET/PUT. PUT echoes the draft but NEVER changes observed_groups (persisted history is server-owned). */
  async function openAuth(page: Page, config: Record<string, unknown>, puts: Record<string, unknown>[] = [], lang: GLang = 'en') {
    await page.route('**/api/auth/oidc/config', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() as Record<string, unknown>
        puts.push(body)
        const { client_secret: _s, client_secret_clear: _c, ...rest } = body
        return json(route, { ...config, ...rest, observed_groups: config.observed_groups, client_secret_configured: true, config_revision: 7 })
      }
      return json(route, config)
    })
    await page.goto('/settings')
    if (lang === 'de') await switchLang(page, 'de')
    await page.getByRole('tab', { name: GROUP_TEXT[lang].authTab }).click()
  }

  async function switchLang(page: Page, lang: GLang) {
    await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
    await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
    await expect(page.locator('h1')).toHaveText(GROUP_TEXT[lang].settings)
  }
  async function restoreEnglish(page: Page, request: import('@playwright/test').APIRequestContext, was: GLang) {
    if (was === 'de') await switchLang(page, 'en')
    const me = await (await request.get('/api/auth/me')).json() as { language: string }
    expect(me.language, 'disposable admin language restored').toBe('en')
  }

  const T = GROUP_TEXT.en
  /** Role section = the container of the role heading and its group inputs (heading -> header row -> section). */
  const roleSection = (page: Page, heading: string) => page.getByRole('heading', { name: heading, exact: true }).locator('xpath=../..')
  const groupInputs = (page: Page, heading: string) => roleSection(page, heading).getByPlaceholder(/Exact provider group value|Exakter Gruppenwert des Anbieters/)
  const values = (page: Page, heading: string) => groupInputs(page, heading).evaluateAll(els => els.map(e => (e as HTMLInputElement).value))
  const suggestion = (page: Page, name: string) => page.locator('li').filter({ has: page.locator('code', { hasText: new RegExp(`^${escRe(name)}$`) }) })
  const observedHeading = (page: Page, lang: GLang = 'en') => page.getByRole('heading', { name: GROUP_TEXT[lang].observed, exact: true })
  const save = (page: Page, lang: GLang = 'en') => page.getByRole('button', { name: GROUP_TEXT[lang].save })

  /** Add a manual mapping row to a role and type `value` into it. */
  async function mapManually(page: Page, heading: string, value: string, lang: GLang = 'en') {
    await roleSection(page, heading).getByRole('button', { name: GROUP_TEXT[lang].add, exact: true }).click()
    await groupInputs(page, heading).last().fill(value)
  }
  async function removeMapping(page: Page, heading: string, value: string, lang: GLang = 'en') {
    const idx = (await values(page, heading)).indexOf(value)
    expect(idx, `mapping "${value}" present in ${heading}`).toBeGreaterThanOrEqual(0)
    await groupInputs(page, heading).nth(idx).locator('xpath=following::button[@aria-label="' + GROUP_TEXT[lang].remove + '"][1]').click()
  }

  test('only unassigned observed groups are suggested; the badge counts the REMAINING visible ones', async ({ page }) => {
    await openAuth(page, baseConfig())
    await expect(suggestion(page, GC)).toHaveCount(1)
    await expect(suggestion(page, GA)).toHaveCount(0)
    await expect(suggestion(page, GB)).toHaveCount(0)
    // badge = remaining visible (1), not the persisted total (3)
    const head = observedHeading(page).locator('xpath=../..')
    await expect(head.getByText('1', { exact: true })).toBeVisible()
    await expect(head.getByText('3', { exact: true })).toHaveCount(0)
    // existing mappings are untouched
    expect(await values(page, T.admin)).toEqual([GA])
    expect(await values(page, T.viewer)).toEqual([GB])
  })

  test('adding a suggestion to Admin hides it immediately BEFORE save; all-assigned empty state differs from no-observed', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, baseConfig(), puts)
    await suggestion(page, GC).getByRole('button', { name: T.addAdmin }).click()
    await expect(suggestion(page, GC)).toHaveCount(0)
    expect(puts, 'nothing is saved by adding a suggestion').toHaveLength(0)
    expect(await values(page, T.admin)).toEqual([GA, GC])
    // observed history exists but every entry is assigned -> "all assigned" copy, NOT the "nothing observed" copy
    await expect(page.getByText(T.allAssigned)).toBeVisible()
    await expect(page.getByText(T.noObserved)).toHaveCount(0)
    // badge (remaining visible count) is hidden at 0
    const head = observedHeading(page).locator('xpath=../..')
    await expect(head.getByText(/^\d+$/)).toHaveCount(0)
    await expect(page.locator('li').filter({ has: page.getByRole('button', { name: T.addAdmin }) })).toHaveCount(0)
  })

  test('with no observed history at all the distinct "nothing observed yet" copy is shown', async ({ page }) => {
    await openAuth(page, baseConfig({ observed_groups: [], admin_groups: [], viewer_groups: [] }))
    await expect(page.getByText(T.noObserved)).toBeVisible()
    await expect(page.getByText(T.allAssigned)).toHaveCount(0)
    await expect(observedHeading(page).locator('xpath=../..').getByText(/^\d+$/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: T.addAdmin })).toHaveCount(0)
  })

  test('Add as viewer hides it too; removing the draft mapping brings the suggestion back', async ({ page }) => {
    await openAuth(page, baseConfig())
    await suggestion(page, GC).getByRole('button', { name: T.addViewer }).click()
    await expect(suggestion(page, GC)).toHaveCount(0)
    expect(await values(page, T.viewer)).toEqual([GB, GC])
    await removeMapping(page, T.viewer, GC)
    await expect(suggestion(page, GC)).toHaveCount(1)
    // an Admin mapping behaves the same
    await suggestion(page, GC).getByRole('button', { name: T.addAdmin }).click()
    await expect(suggestion(page, GC)).toHaveCount(0)
    await removeMapping(page, T.admin, GC)
    await expect(suggestion(page, GC)).toHaveCount(1)
    // removing a pre-existing (persisted) mapping also reveals its group
    await removeMapping(page, T.admin, GA)
    await expect(suggestion(page, GA)).toHaveCount(1)
  })

  test('a group mapped to BOTH roles stays hidden until BOTH mappings are removed; roles are not altered', async ({ page }) => {
    await openAuth(page, baseConfig())
    await suggestion(page, GC).getByRole('button', { name: T.addAdmin }).click()
    await mapManually(page, T.viewer, GC)
    await expect(suggestion(page, GC)).toHaveCount(0)
    expect(await values(page, T.admin)).toEqual([GA, GC])
    expect(await values(page, T.viewer)).toEqual([GB, GC])
    await removeMapping(page, T.admin, GC)
    await expect(suggestion(page, GC)).toHaveCount(0)
    await removeMapping(page, T.viewer, GC)
    await expect(suggestion(page, GC)).toHaveCount(1)
  })

  test('surrounding whitespace still counts as assigned; case change or partial names re-show the exact suggestion', async ({ page }) => {
    await openAuth(page, baseConfig())
    await mapManually(page, T.viewer, `  ${GC}  `)
    await expect(suggestion(page, GC)).toHaveCount(0)
    const input = groupInputs(page, T.viewer).last()
    await input.fill(GC.toUpperCase())
    await expect(suggestion(page, GC)).toHaveCount(1)
    await input.fill(GC.slice(0, -2))
    await expect(suggestion(page, GC)).toHaveCount(1)
    await input.fill(`${GC} `)
    await expect(suggestion(page, GC)).toHaveCount(0)
    await input.fill('')
    await expect(suggestion(page, GC)).toHaveCount(1)
  })

  test('manually mapping an UNOBSERVED group is allowed and never alters the observed history', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, baseConfig(), puts)
    await mapManually(page, T.viewer, 'team-manual')
    // suggestions unchanged (only C), history list not mutated
    await expect(suggestion(page, GC)).toHaveCount(1)
    await expect(suggestion(page, 'team-manual')).toHaveCount(0)
    await save(page).click()
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]!.viewer_groups).toEqual([GB, 'team-manual'])
    expect(puts[0]).not.toHaveProperty('observed_groups')
    // after the (mock) PUT the UI recomputes from the response: history identical, C still suggested
    await expect(suggestion(page, GC)).toHaveCount(1)
  })

  test('save sends the FULL trimmed assigned arrays (hidden groups included), no history and no secret', async ({ page }) => {
    const puts: Record<string, unknown>[] = []
    await openAuth(page, baseConfig(), puts)
    await suggestion(page, GC).getByRole('button', { name: T.addAdmin }).click()
    await mapManually(page, T.viewer, `  ${GA}  `) // same group in both roles is allowed (Admin wins server-side)
    await save(page).click()
    await expect.poll(() => puts.length).toBe(1)
    expect(puts[0]).toMatchObject({ admin_groups: [GA, GC], viewer_groups: [GB, GA] })
    for (const k of ['observed_groups', 'client_secret', 'client_secret_clear']) expect(puts[0]).not.toHaveProperty(k)
    // response applied: suggestions recomputed (all groups assigned, C hidden), no stale draft markers
    await expect(suggestion(page, GC)).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('super-secret')
  })

  test('reloading the page discards the unsaved draft and restores the original suggestions', async ({ page }) => {
    await openAuth(page, baseConfig())
    await suggestion(page, GC).getByRole('button', { name: T.addAdmin }).click()
    await expect(suggestion(page, GC)).toHaveCount(0)
    await page.reload()
    // A click that lands before hydration is lost: retry until the Authentication panel is really shown.
    await expect(async () => {
      await page.getByRole('tab', { name: T.authTab }).click()
      await expect(observedHeading(page)).toBeVisible({ timeout: 1500 })
    }).toPass()
    await expect(suggestion(page, GC)).toHaveCount(1)
    expect(await values(page, T.admin)).toEqual([GA])
  })

  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
    test(`main OIDC sections are vertically stacked in order with equal left edges (EN ${name})`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await openAuth(page, baseConfig())
      const boxes: Array<{ title: string, box: { x: number, y: number } }> = []
      for (const title of T.sections) {
        const h = page.getByRole('heading', { name: title, exact: true })
        await expect(h, `section heading "${title}"`).toHaveCount(1)
        boxes.push({ title, box: (await h.boundingBox())! })
      }
      const pairs = boxes.flatMap((a, i) => boxes.slice(i + 1).map(b => [a, b] as const))
      for (const [a, b] of pairs) {
        // no two main sections share a row (stacked, not side by side), regardless of exact order
        expect(Math.abs(a.box.y - b.box.y), `${a.title} vs ${b.title} vertical separation`).toBeGreaterThan(20)
        expect(Math.abs(a.box.x - b.box.x), `${a.title} vs ${b.title} share the left edge`).toBeLessThan(4)
      }
      expect(await noPageOverflow(page)).toBe(true)
      const mainOverflow = await page.locator('main').evaluate(m => m.scrollWidth > m.clientWidth + 1)
      expect(mainOverflow, 'main scrolls horizontally').toBe(false)
    })
  }

  for (const lang of ['de', 'en'] as const) {
    test(`320px ${lang.toUpperCase()}: populated suggestions keep Add Admin/Viewer usable, long groups wrap, nothing overflows`, async ({ page, request }) => {
      const L = GROUP_TEXT[lang]
      const LONG = `netzwerk-betrieb-${'x'.repeat(80)}`
      await page.setViewportSize({ width: 320, height: 640 })
      try {
        await openAuth(page, baseConfig({ provider_name: LONG.slice(0, 64), observed_groups: [GA, GB, GC, LONG], admin_groups: [GA], viewer_groups: [GB] }), [], lang)
        const rows = [suggestion(page, GC), suggestion(page, LONG)]
        for (const row of rows) {
          await row.scrollIntoViewIfNeeded()
          for (const label of [L.addAdmin, L.addViewer]) {
            const btn = row.getByRole('button', { name: label })
            await expect(btn).toBeVisible()
            const bb = (await btn.boundingBox())!
            expect(bb.x, `${label} left edge`).toBeGreaterThanOrEqual(0)
            expect(bb.x + bb.width, `${label} fits the 320px viewport`).toBeLessThanOrEqual(321)
          }
        }
        expect(await noPageOverflow(page), 'document scrolls horizontally').toBe(true)
        expect(await page.locator('main').evaluate(m => m.scrollWidth > m.clientWidth + 1), 'main scrolls horizontally').toBe(false)
        expect(await overflowingAncestors(page, `li:has(code:text-is("${LONG}")) button`), 'ancestors of the long-group actions overflow').toEqual([])
        const codeBox = (await suggestion(page, LONG).locator('code').boundingBox())!
        expect(codeBox.x + codeBox.width, 'long group name stays inside the viewport (wraps)').toBeLessThanOrEqual(321)
        // both actions are real, clickable controls (not clipped): use them
        await suggestion(page, GC).getByRole('button', { name: L.addAdmin }).click()
        await expect(suggestion(page, GC)).toHaveCount(0)
        await suggestion(page, LONG).getByRole('button', { name: L.addViewer }).click()
        await expect(suggestion(page, LONG)).toHaveCount(0)
        expect(await noPageOverflow(page)).toBe(true)
      } finally {
        await restoreEnglish(page, request, lang)
      }
    })
  }
})

/**
 * REAL-backend CRUD against the candidate (no mocks). Requires OIDC_E2E_REAL_BRANDING=1 and an
 * isolated synthetic server with an authenticated disposable admin (default storage state).
 * Name-only PUTs are cosmetic; the test restores the original name afterwards.
 */
test.describe('Provider name against the real candidate backend', () => {
  test.skip(!process.env.OIDC_E2E_REAL_BRANDING, 'OIDC_E2E_REAL_BRANDING not set (isolated candidate only)')

  test('PUT trims/clears/rejects, public status exposes only the allow-listed name, revision unchanged', async ({ request }) => {
    const original = await (await request.get('/api/auth/oidc/config')).json() as { provider_name: string | null, config_revision: number, enabled: boolean }
    try {
      const a = await request.put('/api/auth/oidc/config', { data: { provider_name: '  SaarAuth  ' } })
      expect(a.status()).toBe(200)
      const aBody = await a.json() as { provider_name: string, config_revision: number }
      expect(aBody.provider_name).toBe('SaarAuth')
      expect(aBody.config_revision, 'name-only change must not bump the revision').toBe(original.config_revision)

      const pub = await (await request.get('/api/auth/oidc/status')).json() as Record<string, unknown>
      expect(Object.keys(pub).every(k => k === 'enabled' || k === 'provider_name')).toBe(true)
      if (pub.enabled === true) expect(pub.provider_name).toBe('SaarAuth')
      else expect(pub).toEqual({ enabled: false })

      expect((await request.put('/api/auth/oidc/config', { data: { provider_name: 'x'.repeat(65) } })).status()).toBe(400)
      expect((await request.put('/api/auth/oidc/config', { data: { provider_name: 'a\nb' } })).status()).toBe(400)
      expect(((await (await request.get('/api/auth/oidc/config')).json()) as { provider_name: string }).provider_name).toBe('SaarAuth')

      const cleared = await request.put('/api/auth/oidc/config', { data: { provider_name: '   ' } })
      expect(((await cleared.json()) as { provider_name: unknown }).provider_name).toBeNull()
    } finally {
      await request.put('/api/auth/oidc/config', { data: { provider_name: original.provider_name } })
    }
  })
})


/**
 * Screenshot artifacts for read-only design review (mocked SSO status/config only; no real
 * credentials are typed). Enabled by setting OIDC_E2E_SHOTS_DIR; otherwise skipped because it
 * only produces artifacts and asserts nothing new.
 */
const SHOTS = process.env.OIDC_E2E_SHOTS_DIR
test.describe('Visual artifacts', () => {
  test.skip(!SHOTS, 'OIDC_E2E_SHOTS_DIR not set')
  const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }
  // fullPage misses content below the dashboard's inner vertical scroller; pass false for viewport shots.
  const shot = (page: Page, name: string, fullPage = true) => { mkdirSync(SHOTS!, { recursive: true }); return page.screenshot({ path: join(SHOTS!, `${name}.png`), fullPage }) }

  type Lang = 'en' | 'de'
  const TEXT = {
    en: { settings: 'Settings', authTab: 'Authentication', accountTab: 'Account', groups: 'Scopes and group access', admin: 'Admin groups', viewer: 'Viewer groups', unmatched: 'Allow users with no matching group as viewers', observed: 'Observed group suggestions', copy: 'Copy URL', callback: 'Registered callback URL' },
    de: { settings: 'Einstellungen', authTab: 'Authentifizierung', accountTab: 'Konto', groups: 'Berechtigungen und Gruppen', admin: 'Admin-Gruppen', viewer: 'Viewer-Gruppen', unmatched: 'Personen ohne passende Gruppe als Viewer zulassen', observed: 'Beobachtete Gruppenvorschläge', copy: 'URL kopieren', callback: 'Registrierte Callback-URL' }
  } as const
  // Realistic, LONG dummy callback (mock only; not a real domain/config).
  const LONG_CALLBACK = 'https://ezswm-oidc-infrastructure-staging.example.test/api/auth/oidc/callback'

  /**
   * Switch the UI language through the supported header language menu (it also persists the
   * profile language). Setting `user.language` via the API alone is NOT applied on the next
   * page load in this app (see report), so it cannot be used to localise screenshots.
   * Asserts the translated Settings heading before returning.
   */
  async function setUiLanguage(page: Page, lang: Lang) {
    await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
    await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
    await expect(page.locator('h1')).toHaveText(TEXT[lang].settings)
  }

  /** Walk up from `el` and assert no ancestor (up to <html>) scrolls horizontally. */
  async function expectNoHorizontalOverflow(page: Page, selector: string) {
    const offenders = await page.locator(selector).first().evaluate((el) => {
      const out: string[] = []
      // Start at the parent: a long value clipped INSIDE an <input> is normal and not layout overflow.
      for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 1) out.push(`${n.tagName.toLowerCase()}.${String(n.className).split(' ')[0]} ${n.scrollWidth}>${n.clientWidth}`)
      }
      return out
    })
    expect(offenders, 'horizontal overflow on the path from the callback field to <html>').toEqual([])
  }

  for (const [label, locale] of [['en', 'en-US'], ['de', 'de-DE']] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`login with SSO button (${label}, ${sizeName})`, async ({ browser, baseURL }) => {
        const ctx = await browser.newContext({ baseURL, viewport, locale, storageState: { cookies: [], origins: [] } })
        const page = await ctx.newPage()
        const seen: string[] = []
        watch(page, seen)
        await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true }))
        await page.goto('/login?oidc_error=oidc_access_denied')
        await expect(page.locator('a[href="/api/auth/oidc/start"]')).toBeVisible()
        await expect(page.locator('body')).toContainText(label === 'de' ? /Ihr Konto hat derzeit keinen Zugriff/ : /does not currently have access/)
        await shot(page, `login-${label}-${sizeName}`)
        await ctx.close()
        expect(seen).toEqual([])
      })
    }
  }

  for (const [label, locale, name] of [['en', 'en-US', 'SaarAuth'], ['de', 'de-DE', 'SaarAuth']] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`login with custom provider name (${label}, ${sizeName})`, async ({ browser, baseURL }) => {
        const ctx = await browser.newContext({ baseURL, viewport, locale, storageState: { cookies: [], origins: [] } })
        const page = await ctx.newPage()
        const seen: string[] = []
        watch(page, seen)
        await page.route('**/api/auth/oidc/status', route => json(route, { enabled: true, provider_name: name }))
        await page.goto('/login')
        await expect(page.locator('a[href="/api/auth/oidc/start"]')).toHaveText(label === 'de' ? 'Mit SaarAuth anmelden' : 'Sign in with SaarAuth')
        await shot(page, `login-branded-${label}-${sizeName}`)
        await ctx.close()
        expect(seen).toEqual([])
      })
    }
  }

  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`admin settings provider display-name field (${lang}, ${sizeName})`, async ({ page, request }) => {
        try {
          await page.setViewportSize(viewport)
          await page.route('**/api/auth/oidc/config', route => json(route, { ...CONFIG, provider_name: 'SaarAuth', callback_url: LONG_CALLBACK }))
          await page.goto('/settings')
          await expect(page.locator('h1')).toBeVisible()
          if (lang === 'de') await setUiLanguage(page, 'de')
          await page.getByRole('tab', { name: TEXT[lang].authTab }).click()
          const label = lang === 'de' ? 'Anzeigename des Anbieters' : 'Provider display name'
          const field = page.getByLabel(label)
          await field.scrollIntoViewIfNeeded()
          await expect(field).toHaveValue('SaarAuth')
          await expect(field).toBeInViewport()
          await expectNoHorizontalOverflow(page, `input[maxlength="64"]`)
          await shot(page, `admin-provider-name-${lang}-${sizeName}`, false)
        } finally {
          if (lang === 'de') await setUiLanguage(page, 'en')
          const me = await (await request.get('/api/auth/me')).json() as { language: string }
          expect(me.language, 'disposable admin language restored').toBe('en')
        }
      })
    }
  }

  // Group suggestions + stacked layout artifacts (mocked config, generic group names) for design review.
  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, viewport] of [['mobile320', { width: 320, height: 640 }], ['desktop', { width: 1440, height: 900 }]] as const) {
      test(`admin group suggestions + layout (${lang}, ${sizeName})`, async ({ page, request }) => {
        const L = GROUP_TEXT[lang]
        const cfg = {
          ...CONFIG, enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true, provider_name: 'SaarAuth',
          observed_groups: [GA, GB, GC, `netzwerk-betrieb-${'x'.repeat(60)}`], admin_groups: [GA], viewer_groups: [GB], callback_url: LONG_CALLBACK
        }
        try {
          await page.setViewportSize(viewport)
          await page.route('**/api/auth/oidc/config', route => json(route, cfg))
          await page.goto('/settings')
          await expect(page.locator('h1')).toBeVisible()
          if (lang === 'de') await setUiLanguage(page, 'de')
          await page.getByRole('tab', { name: L.authTab }).click()
          const groups = page.getByRole('heading', { name: L.sections[1], exact: true })
          await groups.scrollIntoViewIfNeeded()
          await shot(page, `groups-${lang}-${sizeName}-top`, false)
          const observed = page.getByRole('heading', { name: L.observed, exact: true })
          await observed.scrollIntoViewIfNeeded()
          await shot(page, `groups-${lang}-${sizeName}-suggestions`, false)
          // all assigned state
          for (const name of [GC]) await page.locator('li').filter({ has: page.locator('code', { hasText: new RegExp(`^${escRe(name)}$`) }) }).getByRole('button', { name: L.addAdmin }).click()
          await page.locator('li').filter({ has: page.locator('code', { hasText: /^netzwerk-betrieb-/ }) }).getByRole('button', { name: L.addViewer }).click()
          await observed.scrollIntoViewIfNeeded()
          await shot(page, `groups-${lang}-${sizeName}-all-assigned`, false)
        } finally {
          if (lang === 'de') await setUiLanguage(page, 'en')
          const me = await (await request.get('/api/auth/me')).json() as { language: string }
          expect(me.language, 'disposable admin language restored').toBe('en')
        }
      })
    }
  }

  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`viewer Account-only settings (${lang}, ${sizeName})`, async ({ playwright, browser, baseURL, request }) => {
        const username = `e2e_shot_viewer_${lang}_${sizeName}_${Date.now().toString(36)}`
        const password = 'viewer-shot-password-123'
        const created = await request.post('/api/users', { data: { username, display_name: 'E2E Viewer', password, role: 'viewer', language: 'en' } })
        expect(created.ok()).toBe(true)
        const id = ((await created.json()) as { id: string }).id
        const api = await playwright.request.newContext({ baseURL })
        try {
          expect((await api.post('/api/auth/login', { data: { username, password } })).ok()).toBe(true)
          const ctx = await browser.newContext({ storageState: await api.storageState(), baseURL, viewport })
          const page = await ctx.newPage()
          const seen: string[] = []
          watch(page, seen)
          await page.goto('/settings')
          await expect(page.locator('h1')).toBeVisible()
          if (lang === 'de') await setUiLanguage(page, 'de')
          await expect(page.locator('h1')).toHaveText(TEXT[lang].settings)
          await expect(page.getByRole('tab', { name: TEXT[lang].accountTab })).toBeVisible()
          await expect(page.getByRole('tab', { name: new RegExp(`${TEXT.en.authTab}|${TEXT.de.authTab}`) })).toHaveCount(0)
          await shot(page, `viewer-account-${lang}-${sizeName}`)
          await ctx.close()
          expect(seen).toEqual([])
        } finally {
          await api.dispose()
          await request.delete(`/api/users/${id}`)
        }
      })
    }
  }

  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`admin Authentication tab (${lang}, ${sizeName})`, async ({ page, request }) => {
        try {
          await page.setViewportSize(viewport)
          await page.route('**/api/auth/oidc/config', route => json(route, {
            ...CONFIG, enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true,
            admin_groups: ['netadmins'], viewer_groups: ['ops'], allow_unmatched_viewer: false, callback_url: LONG_CALLBACK
          }))
          await page.goto('/settings')
          await expect(page.locator('h1')).toBeVisible()
          if (lang === 'de') await setUiLanguage(page, 'de')
          await expect(page.locator('h1')).toHaveText(TEXT[lang].settings)
          await page.getByRole('tab', { name: TEXT[lang].authTab }).click()

          // Provider section: translated label, long callback URL + visible copy control, no overflow.
          await expect(page.getByText(TEXT[lang].callback, { exact: true })).toBeVisible()
          const cb = page.locator('input[readonly]').first()
          await expect(cb).toHaveValue(LONG_CALLBACK)
          await expect(page.getByRole('button', { name: TEXT[lang].copy })).toBeVisible()
          await expectNoHorizontalOverflow(page, 'input[readonly]')
          await shot(page, `admin-auth-${lang}-${sizeName}-provider`)

          // Mapping / fallback: scroll the inner dashboard scroller to the groups section.
          const heading = page.getByRole('heading', { name: TEXT[lang].groups })
          await heading.scrollIntoViewIfNeeded()
          await expect(heading).toBeInViewport()
          await expect(page.getByText(TEXT[lang].admin, { exact: true })).toBeVisible()
          await expect(page.getByText(TEXT[lang].viewer, { exact: true })).toBeVisible()
          const fallback = page.getByText(TEXT[lang].unmatched)
          await fallback.scrollIntoViewIfNeeded()
          await expect(fallback).toBeInViewport()
          await expect(page.getByText(TEXT[lang].observed)).toBeVisible()
          await expect(page.locator('input[value="netadmins"]')).toHaveCount(1)
          await expectNoHorizontalOverflow(page, 'input[value="netadmins"]')
          await shot(page, `admin-auth-${lang}-${sizeName}-mapping`, false)
        } finally {
          // Leave the disposable admin on English (UI switch persists the profile language).
          if (lang === 'de') await setUiLanguage(page, 'en')
          const me = await (await request.get('/api/auth/me')).json() as { language: string }
          expect(me.language, 'disposable admin language restored').toBe('en')
        }
      })
    }
  }
})

/**
 * Settings page polish (mocked config endpoints; UI contract only, nothing persisted, no IdP).
 * Relative / semantic assertions only (no pixel font guesses):
 *  - no local "ezSWM" eyebrow inside the page content (the global sidebar brand is intentionally kept)
 *  - the General, Account and Authentication tab headings share one VISUAL style (computed typography); their HTML
 *    levels may differ (Authentication is an h2 with child h3 sections) as long as the hierarchy stays valid
 *  - provider fields and the groups claim span the whole inner card content box (a narrower max-width column fails);
 *    callback keeps its own input+copy column
 *  - repeated mapping rows fill their designated column with the delete button at the row end; Add buttons stay inside their column
 */
test.describe('Settings page polish (mocked endpoints)', () => {
  type PLang = 'en' | 'de'
  const PL = {
    en: {
      settings: 'Settings', general: 'General', account: 'Account', sso: 'Authentication', authTab: /^Authentication$/,
      name: /^Provider display name/, issuer: /^Issuer URL/, clientId: /^Client ID/, claim: /^Groups claim/, copy: 'Copy URL',
      admin: 'Admin groups', viewer: 'Viewer groups', add: 'Add', addScope: 'Add scope', removeScope: 'Remove scope', removeGroup: 'Remove group', provider: 'Provider'
    },
    de: {
      settings: 'Einstellungen', general: 'Allgemein', account: 'Konto', sso: 'Authentifizierung', authTab: /^Authentifizierung$/,
      name: /^Anzeigename des Anbieters/, issuer: /^Aussteller-URL/, clientId: /^Client-ID/, claim: /^Gruppen-Claim/, copy: 'URL kopieren',
      admin: 'Admin-Gruppen', viewer: 'Viewer-Gruppen', add: 'Hinzufügen', addScope: 'Scope hinzufügen', removeScope: 'Scope entfernen', removeGroup: 'Gruppe entfernen', provider: 'Anbieter'
    }
  } as const
  const VPS = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } } as const
  const CB = 'https://ezswm-oidc-infrastructure-staging.example.test/api/auth/oidc/callback'
  const cfg = () => ({
    ...CONFIG, enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true,
    provider_name: 'SaarAuth', callback_url: CB, observed_groups: [], admin_groups: ['ops-alpha'], viewer_groups: ['ops-beta'], scopes: ['openid', 'profile']
  })

  async function setLang(page: Page, lang: PLang) {
    await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
    await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
    await expect(page.locator('h1')).toHaveText(PL[lang].settings)
  }
  async function restoreEnglish(page: Page, request: import('@playwright/test').APIRequestContext, was: PLang) {
    if (was === 'de') await setLang(page, 'en')
    const me = await (await request.get('/api/auth/me')).json() as { language: string }
    expect(me.language, 'disposable admin language restored').toBe('en')
  }
  async function openSettings(page: Page, lang: PLang, vp: { width: number, height: number }) {
    await page.setViewportSize(vp)
    await page.route('**/api/auth/oidc/config', route => json(route, cfg()))
    await page.goto('/settings')
    await expect(page.locator('h1')).toBeVisible()
    if (lang === 'de') await setLang(page, 'de')
  }

  type Box = { x: number, y: number, w: number, h: number, r: number, b: number }
  /** Input root (the UInput wrapper) vs the form-field container that owns its <label>, measured in the page. */
  const fieldFit = (input: import('@playwright/test').Locator) => input.evaluate((el) => {
    const box = (n: Element): Box => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom } }
    const input = el as HTMLInputElement
    const label = input.labels?.[0] ?? null
    let field: HTMLElement | null = input.parentElement
    while (field && !(label ? field.contains(label) : field.querySelector('label'))) field = field.parentElement
    if (!field) return null
    const cs = getComputedStyle(field)
    const content = field.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    // Nearest card section: content box = border box minus computed border and padding.
    const sec = field.closest('section')
    let section: { l: number, r: number } | null = null
    if (sec) {
      const sb = sec.getBoundingClientRect()
      const sc = getComputedStyle(sec)
      section = { l: sb.x + parseFloat(sc.borderLeftWidth) + parseFloat(sc.paddingLeft), r: sb.right - parseFloat(sc.borderRightWidth) - parseFloat(sc.paddingRight) }
    }
    return { field: box(field), fieldContentWidth: content, root: box(input.parentElement!), input: box(input), section }
  })
  const overlaps = (a: Box | { x: number, y: number, width: number, height: number }, b: { x: number, y: number, width: number, height: number }) => {
    const A = 'w' in a ? { x: a.x, y: a.y, width: a.w, height: a.h } : a
    return !(A.x + A.width <= b.x + 1 || b.x + b.width <= A.x + 1 || A.y + A.height <= b.y + 1 || b.y + b.height <= A.y + 1)
  }
  const headingInfo = (h: import('@playwright/test').Locator) => h.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { level: Number(el.tagName.slice(1)) || Number(el.getAttribute('aria-level')), size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform, spacing: cs.letterSpacing, color: cs.color }
  })

  for (const lang of ['en', 'de'] as const) {
    for (const [vpName, vp] of Object.entries(VPS)) {
      const T = PL[lang]

      test(`no local ezSWM eyebrow; General, Account and Authentication headings share visual style with valid hierarchy (${lang}, ${vpName})`, async ({ page, request }) => {
        try {
          await openSettings(page, lang, vp)
          const h1 = page.locator('h1')
          await expect(h1).toHaveCount(1)
          await expect(h1).toHaveText(T.settings)
          // The page content has no local brand eyebrow: nothing precedes the title inside its block and
          // no element in the main content area is just "ezSWM". The global sidebar brand is NOT asserted gone.
          await expect(h1.locator('xpath=preceding-sibling::*')).toHaveCount(0)
          await expect(page.locator('#main-content').getByText('ezSWM', { exact: true })).toHaveCount(0)
          if (vpName === 'desktop') await expect(page.getByRole('link', { name: 'ezSWM', exact: true }), 'global sidebar brand is kept').toBeVisible()

          const general = page.getByRole('heading', { name: T.general, exact: true })
          await expect(general).toHaveCount(1)
          const gInfo = await headingInfo(general)
          await page.getByRole('tab', { name: T.account, exact: true }).click()
          const account = page.getByRole('heading', { name: T.account, exact: true })
          await expect(account).toHaveCount(1)
          const aInfo = await headingInfo(account)
          await page.getByRole('tab', { name: T.authTab }).click()
          const sso = page.getByRole('heading', { name: T.sso, exact: true })
          await expect(sso).toHaveCount(1)
          const sInfo = await headingInfo(sso)

          // Valid hierarchy: every tab heading sits below the page h1 (levels may differ between tabs).
          for (const [name, info] of [['General', gInfo], ['Account', aInfo], ['Authentication', sInfo]] as const) {
            expect(info.level, `${name} heading is below the h1`).toBeGreaterThan(1)
          }
          // Shared VISUAL style, compared separately from the HTML level.
          const style = ({ size, weight, transform, spacing, color }: typeof gInfo) => ({ size, weight, transform, spacing, color })
          expect(style(aInfo), 'Account heading typography matches General').toEqual(style(gInfo))
          expect(style(sInfo), 'Authentication heading typography matches General').toEqual(style(gInfo))
          // Child section headings are never shallower than the Authentication heading.
          const provider = page.getByRole('heading', { name: T.provider, exact: true })
          await expect(provider).toHaveCount(1)
          expect((await headingInfo(provider)).level, 'Provider section heading is not shallower than the Authentication heading').toBeGreaterThanOrEqual(sInfo.level)
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })

      test(`provider name, issuer, client ID, secret and callback fill their field; copy button has its own column (${lang}, ${vpName})`, async ({ page, request }) => {
        try {
          await openSettings(page, lang, vp)
          await page.getByRole('tab', { name: T.authTab }).click()
          const inputs: [string, import('@playwright/test').Locator][] = [
            ['provider name', page.getByLabel(T.name)],
            ['issuer', page.getByLabel(T.issuer)],
            ['client id', page.getByLabel(T.clientId)],
            ['client secret', page.locator('input[type="password"][autocomplete="new-password"]')],
            ['groups claim', page.getByLabel(T.claim)],
            ['callback', page.locator('input[readonly]')]
          ]
          // These fields (not the nested callback/copy block) fill the WHOLE inner card content box.
          const wholeCard = new Set(['provider name', 'issuer', 'client id', 'client secret', 'groups claim'])
          for (const [name, input] of inputs) {
            await expect(input, name).toHaveCount(1)
            await input.scrollIntoViewIfNeeded()
            const m = await fieldFit(input)
            expect(m, `${name}: form-field container found`).not.toBeNull()
            expect(m!.root.w, `${name}: input root fills its field container (${Math.round(m!.root.w)} of ${Math.round(m!.fieldContentWidth)})`).toBeGreaterThanOrEqual(m!.fieldContentWidth - 1)
            expect(m!.root.x, `${name}: input starts at the field's left edge`).toBeLessThanOrEqual(m!.field.x + 1 + (m!.field.w - m!.fieldContentWidth))
            expect(m!.root.r, `${name}: input stays inside the viewport`).toBeLessThanOrEqual(vp.width + 1)
            if (wholeCard.has(name)) {
              expect(m!.section, `${name}: inside a card section`).not.toBeNull()
              expect(Math.abs(m!.field.x - m!.section!.l), `${name}: field starts at the card content left edge`).toBeLessThanOrEqual(2)
              expect(m!.section!.r - m!.field.r, `${name}: field spans to the card content right edge (${Math.round(m!.field.r)} of ${Math.round(m!.section!.r)})`).toBeLessThanOrEqual(2)
              expect(m!.root.r, `${name}: input root reaches the card content right edge`).toBeGreaterThanOrEqual(m!.section!.r - 2)
            }
            await testInfoAttachMetric(`${name}-field-vs-input`, m!)
          }

          // Callback + copy: the copy button sits in its own column (desktop) or its own row (320) and never overlaps the input.
          const cbRoot = page.locator('input[readonly]').locator('xpath=..')
          const copy = page.getByRole('button', { name: T.copy })
          await expect(copy).toBeVisible()
          const [ib, bb] = await Promise.all([cbRoot.boundingBox(), copy.boundingBox()])
          expect(overlaps({ x: ib!.x, y: ib!.y, width: ib!.width, height: ib!.height }, bb!), 'copy button overlaps the callback input').toBe(false)
          expect(bb!.x + bb!.width, 'copy button inside viewport').toBeLessThanOrEqual(vp.width + 1)
          if (vpName === 'desktop') expect(bb!.x, 'copy button is beside (after) the input').toBeGreaterThanOrEqual(ib!.x + ib!.width - 1)
          else expect(bb!.x >= ib!.x + ib!.width - 1 || bb!.y >= ib!.y + ib!.height - 1, 'copy button beside or below the input').toBe(true)
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })

      test(`scope and group mapping rows keep input and delete button aligned; Add buttons stay in their column (${lang}, ${vpName})`, async ({ page, request }) => {
        try {
          await openSettings(page, lang, vp)
          await page.getByRole('tab', { name: T.authTab }).click()

          // One in-page measurement per row: input root vs its delete button inside the shared flex row.
          const rowOf = (value: string, label: string) => page.evaluate(([v, aria]) => {
            const input = [...document.querySelectorAll('input')].find(i => i.value === v)
            if (!input) return null
            const box = (n: Element) => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom } }
            let row: HTMLElement | null = input.parentElement
            while (row && !row.querySelector('button')) row = row.parentElement
            const btn = row?.querySelector('button[aria-label]') as HTMLElement | null
            const content = (n: Element) => { const b = n.getBoundingClientRect(); const c = getComputedStyle(n); return { l: b.x + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft), r: b.right - parseFloat(c.borderRightWidth) - parseFloat(c.paddingRight) } }
            const sec = input.closest('section')
            return row && btn ? { row: box(row), root: box(input.parentElement!), btn: box(btn), aria: btn.getAttribute('aria-label'), expected: aria, parent: content(row.parentElement!), section: sec ? content(sec) : null } : null
          }, [value, label] as const)

          const rows: [string, string][] = [['openid', T.removeScope], ['profile', T.removeScope], ['ops-alpha', T.removeGroup], ['ops-beta', T.removeGroup]]
          for (const [value, aria] of rows) {
            await page.locator('input').evaluateAll((els, v) => (els.find(i => (i as HTMLInputElement).value === v) as HTMLElement | undefined)?.scrollIntoView({ block: 'center' }), value)
            const m = await rowOf(value, aria)
            expect(m, `${value}: row with delete button found`).not.toBeNull()
            expect(m!.aria, `${value}: delete button label`).toBe(aria)
            expect(m!.root.r, `${value}: input does not run under the delete button`).toBeLessThanOrEqual(m!.btn.x + 1)
            expect(m!.btn.x - m!.root.r, `${value}: input/delete gap stays small`).toBeLessThanOrEqual(16)
            expect(Math.abs((m!.root.y + m!.root.h / 2) - (m!.btn.y + m!.btn.h / 2)), `${value}: input and delete button vertically centred together`).toBeLessThanOrEqual(6)
            expect(m!.row.r - m!.btn.r, `${value}: delete button sits at the row end`).toBeLessThanOrEqual(1)
            expect(m!.root.x + m!.root.w + (m!.btn.x - m!.root.r) + m!.btn.w, `${value}: input fills the row up to the button`).toBeGreaterThanOrEqual(m!.row.r - 1)
            expect(m!.btn.r, `${value}: delete button inside the viewport`).toBeLessThanOrEqual(vp.width + 1)
            // Row fills its designated column (the rows container), not a narrower island.
            expect(m!.row.x, `${value}: row starts at its column's left edge`).toBeGreaterThanOrEqual(m!.parent.l - 2)
            expect(m!.parent.r - m!.row.r, `${value}: row spans to its column's right edge`).toBeLessThanOrEqual(2)
            expect(m!.row.r - m!.parent.r, `${value}: row does not exceed its column`).toBeLessThanOrEqual(2)
            // Scope rows live in the full-width card column.
            if (aria === T.removeScope) expect(m!.section!.r - m!.row.r, `${value}: scope row spans the card content width`).toBeLessThanOrEqual(2)
          }

          // Groups: two columns side by side on desktop, stacked full-width on mobile; together they span the card content box.
          const colOf = (heading: string) => page.getByRole('heading', { name: heading, exact: true }).locator('xpath=../..').evaluate((el) => {
            const b = el.getBoundingClientRect()
            const sec = el.closest('section')!
            const sb = sec.getBoundingClientRect()
            const sc = getComputedStyle(sec)
            return { x: b.x, r: b.right, y: b.y, sl: sb.x + parseFloat(sc.borderLeftWidth) + parseFloat(sc.paddingLeft), sr: sb.right - parseFloat(sc.borderRightWidth) - parseFloat(sc.paddingRight) }
          })
          const [adminCol, viewerCol] = [await colOf(T.admin), await colOf(T.viewer)]
          expect(Math.abs(adminCol.x - adminCol.sl), 'admin column starts at the card content left edge').toBeLessThanOrEqual(2)
          if (vpName === 'desktop') {
            expect(adminCol.r, 'desktop: admin column is left of the viewer column').toBeLessThanOrEqual(viewerCol.x + 1)
            expect(Math.abs(adminCol.y - viewerCol.y), 'desktop: columns are side by side').toBeLessThanOrEqual(2)
            expect(Math.abs(viewerCol.r - viewerCol.sr), 'desktop: columns together span the card content width').toBeLessThanOrEqual(2)
          } else {
            expect(Math.abs(adminCol.r - adminCol.sr), 'mobile: admin column spans the card content width').toBeLessThanOrEqual(2)
            expect(Math.abs(viewerCol.x - viewerCol.sl), 'mobile: viewer column starts at the card edge').toBeLessThanOrEqual(2)
            expect(Math.abs(viewerCol.r - viewerCol.sr), 'mobile: viewer column spans the card content width').toBeLessThanOrEqual(2)
            expect(viewerCol.y, 'mobile: columns are stacked').toBeGreaterThan(adminCol.y)
          }

          // Add buttons: visible, inside their own column, never beyond it or the viewport.
          for (const heading of [T.admin, T.viewer]) {
            const column = page.getByRole('heading', { name: heading, exact: true }).locator('xpath=../..')
            const add = column.getByRole('button', { name: T.add, exact: true })
            await add.scrollIntoViewIfNeeded()
            await expect(add).toBeVisible()
            const [cb, ab] = await Promise.all([column.boundingBox(), add.boundingBox()])
            expect(ab!.x + ab!.width, `${heading}: Add stays inside its column`).toBeLessThanOrEqual(cb!.x + cb!.width + 1)
            expect(ab!.x, `${heading}: Add stays inside its column (left)`).toBeGreaterThanOrEqual(cb!.x - 1)
            expect(ab!.x + ab!.width, `${heading}: Add inside viewport`).toBeLessThanOrEqual(vp.width + 1)
          }
          const addScope = page.getByRole('button', { name: T.addScope })
          await addScope.scrollIntoViewIfNeeded()
          await expect(addScope).toBeVisible()
          expect((await addScope.boundingBox())!.x + (await addScope.boundingBox())!.width, 'Add scope inside viewport').toBeLessThanOrEqual(vp.width + 1)
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })
    }
  }

  // Authentication header: heading, saved-status badge, description and revision panel must never overlap (any viewport).
  // Texts come from the real locale files (not hard-coded copies); stacking/wrapping is allowed, overlap and clipping are not.
  const localeOidc = (lang: PLang) => (JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales', `${lang}.json`), 'utf8')) as { settings: { oidc: Record<string, string> } }).settings.oidc

  for (const lang of ['en', 'de'] as const) {
    for (const [vpName, vp] of Object.entries(VPS)) {
      test(`Authentication header: heading, saved status, description and revision never overlap or clip (${lang}, ${vpName})`, async ({ page, request }) => {
        const L = localeOidc(lang)
        try {
          await openSettings(page, lang, vp)
          const general = page.getByRole('heading', { name: PL[lang].general, exact: true })
          const generalStyle = await headingInfo(general)
          await page.getByRole('tab', { name: PL[lang].authTab }).click()

          const heading = page.getByRole('heading', { name: L.tab, exact: true })
          const status = page.getByText(L.savedEnabled, { exact: true })
          const description = page.getByText(L.description, { exact: true })
          const revLabel = page.getByText(L.savedRevision, { exact: true })
          const revValue = revLabel.locator('xpath=..').getByText(String(cfg().config_revision), { exact: true })
          const parts: [string, import('@playwright/test').Locator][] = [['heading', heading], ['status', status], ['description', description], ['revision label', revLabel], ['revision value', revValue]]
          for (const [name, loc] of parts) {
            await expect(loc, name).toHaveCount(1)
            await loc.scrollIntoViewIfNeeded()
            await expect(loc, name).toBeVisible()
          }
          // Page-level heading style stays consistent with General.
          const own = await headingInfo(heading)
          const style = ({ size, weight, transform, spacing, color }: typeof own) => ({ size, weight, transform, spacing, color })
          expect(style(own), 'Authentication heading typography matches General').toEqual(style(generalStyle))

          const boxes = new Map<string, { x: number, y: number, width: number, height: number }>()
          for (const [name, loc] of parts) boxes.set(name, (await loc.boundingBox())!)
          for (const [name, b] of boxes) {
            expect(b.x, `${name}: inside viewport (left)`).toBeGreaterThanOrEqual(-1)
            expect(b.x + b.width, `${name}: inside viewport (right)`).toBeLessThanOrEqual(vp.width + 1)
          }
          const names = [...boxes.keys()]
          for (let i = 0; i < names.length; i++) {
            for (let j = i + 1; j < names.length; j++) {
              expect(overlaps(boxes.get(names[i]!)!, boxes.get(names[j]!)!), `${names[i]} overlaps ${names[j]}`).toBe(false)
            }
          }
          // Heading text is fully readable: its own box is at least as wide as its text and it does not scroll/clip.
          const clipped = await heading.evaluate((el) => {
            const range = document.createRange()
            range.selectNodeContents(el)
            return range.getBoundingClientRect().width > el.getBoundingClientRect().width + 1 || el.scrollWidth > el.clientWidth + 1
          })
          expect(clipped, 'Authentication heading text is clipped').toBe(false)

          const h = boxes.get('heading')!, d = boxes.get('description')!, rl = boxes.get('revision label')!, st = boxes.get('status')!
          if (vpName === 'desktop') {
            // Existing desktop layout: revision panel stays inline to the right of the heading/description block.
            expect(rl.x, 'desktop: revision panel is right of the heading').toBeGreaterThanOrEqual(h.x + h.width - 1)
            expect(rl.x, 'desktop: revision panel is right of the description').toBeGreaterThanOrEqual(d.x + d.width - 1)
            expect(st.x, 'desktop: status badge follows the heading inline').toBeGreaterThanOrEqual(h.x + h.width - 1)
          } else {
            // Mobile: stacking/wrapping is fine, but the description must not be squeezed into a tiny column:
            // it keeps at least half of the tab panel width.
            const panelWidth = await page.getByRole('tabpanel').first().evaluate(el => el.clientWidth)
            expect(d.width, `mobile: description keeps a normal column (${Math.round(d.width)} of ${panelWidth})`).toBeGreaterThanOrEqual(panelWidth / 2)
          }
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)
          const shots = process.env.OIDC_E2E_SHOTS_DIR
          if (shots) {
            mkdirSync(shots, { recursive: true })
            await heading.scrollIntoViewIfNeeded()
            await page.screenshot({ path: join(shots, `settings-polish-header-${lang}-${vpName}.png`) })
          }
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })
    }
  }

  test('width guard has teeth: a ~680px capped column fails the card-width check on a wide desktop, and passes once restored (en)', async ({ page, request }) => {
    try {
      await openSettings(page, 'en', VPS.desktop)
      await page.getByRole('tab', { name: PL.en.authTab }).click()
      const input = page.getByLabel(PL.en.issuer)
      await input.scrollIntoViewIfNeeded()
      const baseline = await fieldFit(input)
      expect(baseline!.section!.r - baseline!.field.r, 'real layout spans the card content width').toBeLessThanOrEqual(2)
      expect(baseline!.section!.r - baseline!.section!.l, 'wide desktop card is wider than the old 680px column').toBeGreaterThan(700)
      // Temporary DOM cap reproduces the old max-w-2xl-style column; it is removed again below (no source edit).
      const capped = await input.evaluate((el) => {
        const sec = el.closest('section')!
        let wrapper: HTMLElement = el.parentElement!
        while (wrapper.parentElement && wrapper.parentElement !== sec) wrapper = wrapper.parentElement
        // Cap the section's direct child that holds the field, not the field itself.
        const target = wrapper.querySelector('.min-w-0.w-full') as HTMLElement | null ?? wrapper
        target.style.maxWidth = '42rem'
        target.dataset.testCap = '1'
        return true
      })
      expect(capped).toBe(true)
      const narrowed = await fieldFit(input)
      expect(narrowed!.section!.r - narrowed!.field.r, 'a 42rem cap leaves the field short of the card edge and would fail the guard').toBeGreaterThan(2)
      await input.evaluate((el) => { const t = el.closest('[data-test-cap]') as HTMLElement | null; if (t) { t.style.maxWidth = ''; delete t.dataset.testCap } })
      const restored = await fieldFit(input)
      expect(restored!.section!.r - restored!.field.r, 'removing the temporary cap restores full width').toBeLessThanOrEqual(2)
    } finally {
      await restoreEnglish(page, request, 'en')
    }
  })

  /** Attach measured geometry (numbers only) so a failing/passing run documents what was compared. */
  async function testInfoAttachMetric(name: string, data: unknown) {
    await test.info().attach(`${name}.json`, { body: JSON.stringify(data), contentType: 'application/json' })
  }
})

/**
 * Credential-free Settings polish screenshots for design review (mocked config; set OIDC_E2E_SHOTS_DIR to a NEW directory).
 * Names: settings-polish-{en,de}-{desktop,mobile320}-{provider,groups}.png
 */
test.describe('Settings polish screenshots (mocked endpoints)', () => {
  test.skip(!process.env.OIDC_E2E_SHOTS_DIR, 'OIDC_E2E_SHOTS_DIR not set')
  const dir = process.env.OIDC_E2E_SHOTS_DIR!
  const SIZES = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } } as const
  const HEAD = {
    en: { provider: 'Provider', groups: 'Scopes and group access', menu: 'English', authTab: /^Authentication$/, settings: 'Settings' },
    de: { provider: 'Anbieter', groups: 'Berechtigungen und Gruppen', menu: 'Deutsch', authTab: /^Authentifizierung$/, settings: 'Einstellungen' }
  } as const
  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, vp] of Object.entries(SIZES)) {
      test(`settings polish provider + groups (${lang}, ${sizeName})`, async ({ page, request }) => {
        const H = HEAD[lang]
        mkdirSync(dir, { recursive: true })
        await page.setViewportSize(vp)
        await page.route('**/api/auth/oidc/config', route => json(route, {
          ...CONFIG, enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true, provider_name: 'SaarAuth',
          callback_url: 'https://ezswm-oidc-infrastructure-staging.example.test/api/auth/oidc/callback', observed_groups: ['ops-gamma'], admin_groups: ['ops-alpha'], viewer_groups: ['ops-beta']
        }))
        try {
          await page.goto('/settings')
          await expect(page.locator('h1')).toBeVisible()
          if (lang === 'de') {
            await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
            await page.getByRole('menuitem', { name: H.menu }).click()
            await expect(page.locator('h1')).toHaveText(H.settings)
          }
          await page.getByRole('tab', { name: H.authTab }).click()
          const provider = page.getByRole('heading', { name: H.provider, exact: true })
          await provider.scrollIntoViewIfNeeded()
          await expect(provider).toBeInViewport()
          await page.screenshot({ path: join(dir, `settings-polish-${lang}-${sizeName}-provider.png`) })
          const groups = page.getByRole('heading', { name: H.groups, exact: true })
          await groups.scrollIntoViewIfNeeded()
          await expect(groups).toBeInViewport()
          await page.screenshot({ path: join(dir, `settings-polish-${lang}-${sizeName}-groups.png`) })
        } finally {
          if (lang === 'de') {
            await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
            await page.getByRole('menuitem', { name: 'English' }).click()
            await expect(page.locator('h1')).toHaveText('Settings')
          }
          const me = await (await request.get('/api/auth/me')).json() as { language: string }
          expect(me.language, 'disposable admin language restored').toBe('en')
        }
      })
    }
  }
})
