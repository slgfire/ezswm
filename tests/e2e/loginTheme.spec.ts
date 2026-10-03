import { test, expect, type Browser, type Page, type Route } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Login theme consistency (EN/DE, dark/light, desktop 1440 / mobile 320). Public status is MOCKED
 * ({ enabled: true, provider_name: 'SaarAuth' }): these assert the LOCAL UI only, no IdP, no real credentials,
 * no SSO click. Colors are NEVER hard-coded: every expectation is compared with the SAME-RENDER value that the
 * normal UI tokens resolve to, via temporary non-interactive probe elements (appended to <body>, removed again).
 * Reference tokens: card = `--ui-bg` + ring from `--ui-border`; solid buttons = `--ui-primary` / `--ui-text-inverted`.
 * The authenticated cases compare the login with a normal UCard (subnet calculator result) and the normal
 * Create Site button of the Sites list (own fixture site, nothing clicked/saved).
 * Screenshots are written only when LOGIN_THEME_SHOTS_DIR is set.
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const SHOTS = process.env.LOGIN_THEME_SHOTS_DIR
const SSO_HREF = 'a[href="/api/auth/oidc/start"]'
const LONG_NAME = 'Saar'.repeat(16)
const HTML_NAME = '<img src=x onerror="window.__xss=1"><b>Saar</b>'
const LANG = {
  en: { locale: 'en-US', branded: 'Sign in with SaarAuth', generic: 'Continue with your organization' },
  de: { locale: 'de-DE', branded: 'Mit SaarAuth anmelden', generic: 'Mit dem Organisationskonto fortfahren' }
} as const
type Lang = keyof typeof LANG
type Theme = 'dark' | 'light'
const VP = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } } as const

interface Allow { status: number, path: string }

// BEGIN matcher (also exercised by the private node selftest)
const FAILED_RESOURCE = /^Failed to load resource: the server responded with a status of (\d{3})\b/
/** True ONLY for a console-error text that is the browser's failed-resource line with exactly the allowed numeric status AND whose location path is exactly the allowed path. */
function isDeliberateConsole(text: string, url: string, allow?: Allow): boolean {
  if (!allow) return false
  const hit = FAILED_RESOURCE.exec(text)
  if (!hit || Number(hit[1]) !== allow.status) return false
  try { return new URL(url, 'http://x').pathname === allow.path } catch { return false }
}
// END matcher

/** Anonymous context + page with strict console accounting (only the exact intentional failed request is set aside). */
async function openLogin(browser: Browser, baseURL: string | undefined, o: { lang: Lang, vp: keyof typeof VP, status: unknown, statusCode?: number, query?: string, allow?: Allow }) {
  const ctx = await browser.newContext({ baseURL, locale: LANG[o.lang].locale, viewport: VP[o.vp], storageState: { cookies: [], origins: [] } })
  const page = await ctx.newPage()
  const seen: string[] = []
  const expected: string[] = []
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const deliberate = isDeliberateConsole(m.text(), m.location().url, o.allow)
    ;(deliberate ? expected : seen).push(`console: ${redact(m.text())}`)
  })
  page.on('pageerror', e => seen.push(`pageerror: ${redact(e.message)}`))
  await page.route('**/api/auth/oidc/status', route => json(route, o.status, o.statusCode ?? 200))
  await page.goto(`/login${o.query ?? ''}`)
  await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
  return { ctx, page, seen, expected }
}

/** Switch theme through the real header/auth theme button and wait for the real <html> class + a stable render. */
async function setTheme(page: Page, theme: Theme) {
  const html = page.locator('html')
  const wantDark = theme === 'dark'
  if ((await html.evaluate(e => e.classList.contains('dark'))) !== wantDark) {
    await page.getByRole('button', { name: wantDark ? 'Switch to dark mode' : 'Switch to light mode' }).click()
  }
  await expect.poll(() => html.evaluate(e => e.classList.contains('dark'))).toBe(wantDark)
  let last = ''
  let stable = 0
  await expect.poll(async () => {
    const now = await page.evaluate(() => getComputedStyle(document.body).backgroundColor + getComputedStyle(document.documentElement).color)
    stable = now === last ? stable + 1 : 0
    last = now
    return stable
  }, { message: 'theme render settled' }).toBeGreaterThanOrEqual(3)
}

interface Rgba { r: number, g: number, b: number, a: number }
interface Snap {
  probes: { primary: string, inverted: string, bg: string, border: string }
  rgba: { cardBg: Rgba, wrapperBg: Rgba }
  card: { bg: string, shadow: string, x: number, w: number } | null
  wrapperBg: string | null
  divider: { headerBottomWidth: string, headerBottomColor: string, bodyTopWidth: string, bodyTopColor: string } | null
  submit: { bg: string, color: string } | null
  sso: { bg: string, color: string, x: number, w: number, clipped: boolean } | null
  overflow: boolean
}

/** Read computed values + temporary token probes. Probes are removed in finally; product styles/events are untouched. */
function snapshot(page: Page): Promise<Snap> {
  return page.evaluate(() => {
    const toRgba = (c: string) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 1
      const g = cv.getContext('2d')!
      g.fillStyle = '#000'; g.fillStyle = c; g.clearRect(0, 0, 1, 1); g.fillRect(0, 0, 1, 1)
      const d = g.getImageData(0, 0, 1, 1).data
      return { r: d[0]!, g: d[1]!, b: d[2]!, a: d[3]! }
    }
    const probes: HTMLElement[] = []
    const probe = (css: string) => {
      const p = document.createElement('div')
      p.setAttribute('data-e2e-probe', ''); p.setAttribute('aria-hidden', 'true')
      p.style.cssText = `position:fixed;left:-9999px;top:0;width:1px;height:1px;pointer-events:none;${css}`
      document.body.appendChild(p); probes.push(p)
      return getComputedStyle(p)
    }
    try {
      const primary = probe('background-color:var(--ui-primary);color:var(--ui-text-inverted)')
      const bgp = probe('background-color:var(--ui-bg)')
      const bd = probe('border:1px solid var(--ui-border)')
      const out = { probes: { primary: primary.backgroundColor, inverted: primary.color, bg: bgp.backgroundColor, border: bd.borderTopColor } }
      const h1 = document.querySelector('h1')
      const header = h1?.closest('[data-slot="header"]') ?? null
      const card = (header?.parentElement ?? h1?.closest('[data-slot="root"]') ?? null) as HTMLElement | null
      const wrapper = document.querySelector('div.min-h-screen') as HTMLElement | null
      const cs = card ? getComputedStyle(card) : null
      const r = card?.getBoundingClientRect()
      const body = header?.nextElementSibling ? getComputedStyle(header.nextElementSibling) : null
      const head = header ? getComputedStyle(header) : null
      const sub = document.querySelector('form button[type="submit"]')
      const sso = document.querySelector('a[href="/api/auth/oidc/start"]') as HTMLElement | null
      const ssr = sso?.getBoundingClientRect()
      return {
        ...out,
        rgba: { cardBg: toRgba(cs?.backgroundColor ?? '#000'), wrapperBg: toRgba(wrapper ? getComputedStyle(wrapper).backgroundColor : '#000') },
        card: cs && r ? { bg: cs.backgroundColor, shadow: cs.boxShadow, x: r.x, w: r.width } : null,
        wrapperBg: wrapper ? getComputedStyle(wrapper).backgroundColor : null,
        divider: head && body ? { headerBottomWidth: head.borderBottomWidth, headerBottomColor: head.borderBottomColor, bodyTopWidth: body.borderTopWidth, bodyTopColor: body.borderTopColor } : null,
        submit: sub ? { bg: getComputedStyle(sub).backgroundColor, color: getComputedStyle(sub).color } : null,
        sso: sso && ssr ? { bg: getComputedStyle(sso).backgroundColor, color: getComputedStyle(sso).color, x: ssr.x, w: ssr.width, clipped: sso.scrollWidth > sso.clientWidth + 1 } : null,
        overflow: !(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.body.scrollWidth <= document.body.clientWidth + 1)
      }
    } finally {
      probes.forEach(p => p.remove())
    }
  })
}

const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol

/** The token contract shared by every rendered login case. `sso` = whether the SSO link is expected. */
function expectTokens(s: Snap, theme: Theme, sso: boolean) {
  // Card = the normal UCard surface (--ui-bg) with a ring built from the theme border token.
  expect(s.card, 'login card found from the h1 ancestor').not.toBeNull()
  expect(s.card!.bg, 'card background is the normal UCard token (--ui-bg)').toBe(s.probes.bg)
  expect(s.card!.shadow, 'card ring uses the theme border token (--ui-border)').toContain(s.probes.border)
  // The normal UCard `divide-y` divider must exist (a 1px rule on the header's bottom OR the body's top) in the theme border color.
  // Never skipped: a missing/zero-width divider fails.
  expect(s.divider, 'header and body slots found').not.toBeNull()
  const d = s.divider!
  const headerRule = d.headerBottomWidth === '1px' && d.headerBottomColor === s.probes.border
  const bodyRule = d.bodyTopWidth === '1px' && d.bodyTopColor === s.probes.border
  expect(headerRule || bodyRule, 'a 1px header/body divider in the theme border color exists').toBe(true)
  // Dark mode stays neutral black/gray (no blue tint), judged on channels not on a palette.
  if (theme === 'dark') {
    for (const [name, c] of [['card', s.rgba.cardBg], ['page', s.rgba.wrapperBg]] as const) {
      expect(near(c.r, c.g, 3) && near(c.g, c.b, 3), `${name} background is neutral in dark mode`).toBe(true)
    }
  }
  // Local button = normal solid primary UButton; SSO link uses exactly the same semantic colors.
  expect(s.submit!.bg, 'local button bg = --ui-primary').toBe(s.probes.primary)
  expect(s.submit!.color, 'local button text = --ui-text-inverted').toBe(s.probes.inverted)
  if (sso) {
    expect(s.sso, 'SSO link present').not.toBeNull()
    expect(s.sso!.bg, 'SSO bg = --ui-primary (same as local)').toBe(s.probes.primary)
    expect(s.sso!.color, 'SSO text = --ui-text-inverted (same as local)').toBe(s.probes.inverted)
    expect(s.sso!.clipped, 'SSO label not clipped').toBe(false)
  } else {
    expect(s.sso, 'SSO link absent').toBeNull()
  }
  expect(s.overflow, 'no horizontal page overflow').toBe(false)
}

const shot = async (page: Page, name: string) => {
  if (!SHOTS) return
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: join(SHOTS, `${name}.png`) })
}

test.describe('Login theme consistency (mocked public status, local UI only)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  const SSO = { enabled: true, provider_name: 'SaarAuth' }

  // 8: EN/DE x dark/light x desktop/mobile320
  for (const lang of ['en', 'de'] as const) {
    for (const vp of ['desktop', 'mobile320'] as const) {
      for (const theme of ['dark', 'light'] as const) {
        test(`tokens: normal UCard surface/ring, neutral dark, shared solid button colors (${lang}, ${theme}, ${vp})`, async ({ browser, baseURL }) => {
          const { ctx, page, seen } = await openLogin(browser, baseURL, { lang, vp, status: SSO })
          await expect(page.locator(SSO_HREF)).toHaveText(LANG[lang].branded)
          await setTheme(page, theme)
          expectTokens(await snapshot(page), theme, true)
          // local form first: submit above the SSO link
          const [sb, lb] = await Promise.all([page.locator('form button[type="submit"]').boundingBox(), page.locator(SSO_HREF).boundingBox()])
          expect(sb!.y + sb!.height).toBeLessThanOrEqual(lb!.y + 1)
          await shot(page, `login-theme-${lang}-${theme}-${vp}`)
          await ctx.close()
          expect(seen, 'unexpected browser console/page errors').toEqual([])
        })
      }
    }
  }

  // 2: real :hover / keyboard :focus-visible parity between the local button and the SSO link (no forced states)
  for (const theme of ['dark', 'light'] as const) {
    test(`hover and keyboard focus of the SSO link match the normal local button (en, ${theme}, desktop)`, async ({ browser, baseURL }) => {
      const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: SSO })
      await setTheme(page, theme)
      const submit = page.locator('form button[type="submit"]')
      const sso = page.locator(SSO_HREF)
      const bg = (l: import('@playwright/test').Locator) => l.evaluate(e => getComputedStyle(e).backgroundColor)
      await submit.hover()
      await page.waitForTimeout(400)
      const localHover = await bg(submit)
      await sso.hover()
      await expect.poll(() => bg(sso), { message: 'SSO hover bg equals local hover bg' }).toBe(localHover)
      await page.mouse.move(2, 2)
      // keyboard focus: Tab from the username field to each control (bounded)
      const outline = (l: import('@playwright/test').Locator) => l.evaluate((e) => {
        const c = getComputedStyle(e)
        return { style: c.outlineStyle, width: c.outlineWidth, color: c.outlineColor, offset: c.outlineOffset }
      })
      const tabTo = async (l: import('@playwright/test').Locator) => {
        for (let i = 0; i < 8; i++) { if (await l.evaluate(e => e === document.activeElement)) return true; await page.keyboard.press('Tab') }
        return false
      }
      await page.locator('input[autocomplete="username"]').focus()
      expect(await tabTo(submit)).toBe(true)
      const localFocus = await outline(submit)
      expect(await tabTo(sso)).toBe(true)
      expect(await outline(sso), 'SSO keyboard focus ring equals the normal button focus ring').toEqual(localFocus)
      expect(localFocus.style).not.toBe('none')
      await ctx.close()
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }

  test('keyboard order: username, password, remember me, login, SSO link (en, desktop)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: SSO })
    await page.locator('input[autocomplete="username"]').focus()
    const kind = () => page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null
      if (!e) return 'none'
      if (e.matches('a[href="/api/auth/oidc/start"]')) return 'sso'
      if (e.matches('form button[type="submit"]')) return 'submit'
      if (e.matches('input[autocomplete="username"]')) return 'username'
      if (e.matches('input[type="password"]')) return 'password'
      if (e.matches('[role="checkbox"], input[type="checkbox"]')) return 'checkbox'
      return 'other'
    })
    const order: string[] = [await kind()]
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); order.push(await kind()) }
    expect(order).toEqual(['username', 'password', 'checkbox', 'submit', 'sso'])
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('64 unbroken characters wrap/stay inside 320px with a visible keyboard focus ring (en, dark)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'mobile320', status: { enabled: true, provider_name: LONG_NAME } })
    const sso = page.locator(SSO_HREF)
    await expect(sso).toContainText(LONG_NAME)
    expectTokens(await snapshot(page), 'dark', true)
    await sso.focus()
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
    expect(await sso.evaluate(e => e === document.activeElement)).toBe(true)
    expect(await sso.evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe('none')
    const vp = page.viewportSize()!
    const box = (await sso.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1)
    await shot(page, 'login-theme-long-name-en-dark-mobile320')
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('HTML-looking provider name stays plain text and tokens hold (de, light, desktop)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'de', vp: 'desktop', status: { enabled: true, provider_name: HTML_NAME } })
    await expect(page.locator(SSO_HREF)).toContainText(HTML_NAME)
    await expect(page.locator(`${SSO_HREF} img, ${SSO_HREF} b, ${SSO_HREF} script`)).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
    await setTheme(page, 'light')
    expectTokens(await snapshot(page), 'light', true)
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('missing provider name falls back to the generic label with the same tokens (en, light, desktop)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: { enabled: true } })
    await expect(page.locator(SSO_HREF)).toHaveText(LANG.en.generic)
    await setTheme(page, 'light')
    expectTokens(await snapshot(page), 'light', true)
    await shot(page, 'login-theme-generic-en-light-desktop')
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('status 500 keeps the local form with normal tokens and no SSO link (en, dark, desktop)', async ({ browser, baseURL }) => {
    const { ctx, page, seen, expected } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: { error: 'x' }, statusCode: 500, allow: { status: 500, path: '/api/auth/oidc/status' } })
    await expect(page.locator(SSO_HREF)).toHaveCount(0)
    expectTokens(await snapshot(page), 'dark', false)
    await ctx.close()
    expect(seen, 'unexpected browser console/page errors').toEqual([])
    expect(expected.length, 'the deliberate 500 was observed').toBeGreaterThanOrEqual(1)
  })

  test('SSO disabled: local-only card keeps the normal tokens (en, dark, desktop)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: { enabled: false } })
    await expect(page.locator(SSO_HREF)).toHaveCount(0)
    expectTokens(await snapshot(page), 'dark', false)
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('safe oidc_error alert stays above the form and tokens hold (de, dark, mobile320)', async ({ browser, baseURL }) => {
    const { ctx, page, seen } = await openLogin(browser, baseURL, { lang: 'de', vp: 'mobile320', status: SSO, query: '?oidc_error=oidc_access_denied' })
    const alert = page.getByRole('alert').first()
    await expect(alert).toBeVisible()
    const [ab, fb] = await Promise.all([alert.boundingBox(), page.locator('input[autocomplete="username"]').boundingBox()])
    expect(ab!.y + ab!.height).toBeLessThanOrEqual(fb!.y + 1)
    expectTokens(await snapshot(page), 'dark', true)
    await shot(page, 'login-theme-oidc-error-de-dark-mobile320')
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('local form submit path: one mocked rejected submit shows the error, SSO never starts (en, dark)', async ({ browser, baseURL }) => {
    const { ctx, page, seen, expected } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: SSO, allow: { status: 401, path: '/api/auth/login' } })
    // Proves only the local FAILURE path (rejected mock -> error alert, no SSO request); it does NOT prove a successful login or redirect.
    let loginCalls = 0
    const ssoStarts: string[] = []
    page.on('request', (r) => { if (new URL(r.url()).pathname === '/api/auth/oidc/start') ssoStarts.push(r.method()) })
    await page.route('**/api/auth/login', (route) => { loginCalls++; return json(route, { statusMessage: 'Invalid credentials' }, 401) })
    await page.locator('input[autocomplete="username"]').fill('mock_user')
    await page.locator('input[type="password"]').fill('mock-pass-1')
    await page.locator('input[type="password"]').press('Enter')
    await expect(page.getByRole('alert').first()).toBeVisible()
    expect(loginCalls).toBe(1)
    expect(ssoStarts).toEqual([])
    expectTokens(await snapshot(page), 'dark', true)
    await ctx.close()
    expect(seen, 'unexpected browser console/page errors').toEqual([])
    expect(expected.length, 'the deliberate 401 was observed').toBeGreaterThanOrEqual(1)
  })
})

/**
 * Authenticated reference (default storageState of the private config: own fixture, read-only, nothing clicked/saved):
 * the login card/buttons must resolve to the SAME values as a normal UCard and the standard Create Site button
 * in the same theme.
 */
test.describe('Login vs normal authenticated UI (same theme, mocked status)', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`login card and buttons match a normal UCard and the Create Site button (${theme}, desktop)`, async ({ page, browser, baseURL }) => {
      const seen: string[] = []
      page.on('console', (m) => { if (m.type() === 'error') seen.push(`console: ${redact(m.text())}`) })
      page.on('pageerror', e => seen.push(`pageerror: ${redact(e.message)}`))
      await page.setViewportSize(VP.desktop)
      // normal UCard: subnet calculator result card
      await page.goto('/tools/subnet-calculator')
      await page.locator('main input').first().fill('10.0.0.0/24')
      const ucard = page.locator('main div[class*="ring-default"]').first()
      await expect(ucard).toBeVisible()
      await setTheme(page, theme)
      const ref = await ucard.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, shadow: c.boxShadow } })
      // standard Create Site button
      await page.goto('/sites')
      const create = page.locator('a[href="/sites/create"]').filter({ visible: true }).first()
      await expect(create).toBeVisible()
      await setTheme(page, theme)
      const createRef = await create.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, color: c.color } })

      const { ctx, page: lp, seen: lseen } = await openLogin(browser, baseURL, { lang: 'en', vp: 'desktop', status: { enabled: true, provider_name: 'SaarAuth' } })
      await setTheme(lp, theme)
      const s = await snapshot(lp)
      expect(s.card!.bg, 'login card bg = normal UCard bg').toBe(ref.bg)
      expect(s.card!.shadow, 'login card ring = normal UCard ring').toBe(ref.shadow)
      expect(s.submit!.bg, 'local button = Create Site button bg').toBe(createRef.bg)
      expect(s.submit!.color, 'local button text = Create Site button text').toBe(createRef.color)
      expect(s.sso!.bg, 'SSO bg = Create Site button bg').toBe(createRef.bg)
      expect(s.sso!.color, 'SSO text = Create Site button text').toBe(createRef.color)
      await ctx.close()
      expect([...seen, ...lseen], 'unexpected browser console/page errors').toEqual([])
    })
  }
})
