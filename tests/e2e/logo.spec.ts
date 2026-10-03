import { test, expect, type Browser, type Locator, type Page, type Route } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Logo integration (PR #285 assets). 28 cases:
 *  - [login]   8: EN/DE x dark/light x desktop 1440 / mobile 320 (anonymous, public status MOCKED -> UI only)
 *  - [setup]   8: same matrix on /setup of a FRESH owned dev instance (project `setup`, read-only: GET requests only)
 *  - [sidebar] 8: same matrix, authenticated admin fixture; desktop also collapses/expands through the normal UI toggle,
 *                 mobile320 uses the real drawer (hamburger)
 *  - [assets]/[metadata]/[brand-link]/[users-nav] 4
 * Known-asset checks only (pinned PR commit): this is NOT a generic SVG safety claim. No real IdP, no data writes.
 * The only profile write is the normal header language menu (DE cases), always restored to English in `finally`.
 * Screenshots are written only when LOGO_SHOTS_DIR is set.
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.LOGO_SHOTS_DIR
/** Exact servers: the candidate (login/sidebar/assets) and a fresh OWNED dev instance (setup). Checked BEFORE any navigation. */
const CANDIDATE_BASE = 'http://127.0.0.1:3105'
const SETUP_BASE = 'http://127.0.0.1:3106'
const expectBase = (actual: string | undefined, expected: string) => expect(actual, `baseURL must be exactly ${expected}`).toBe(expected)
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return
  mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: join(SHOTS, `${name}.png`) })
}

const LANGS = { en: 'en-US', de: 'de-DE' } as const
type Lang = keyof typeof LANGS
type Theme = 'dark' | 'light'
type Vp = 'desktop' | 'mobile320'
const VPS = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } } as const
const MATRIX = (['en', 'de'] as const).flatMap(lang => (['dark', 'light'] as const).flatMap(theme => (['desktop', 'mobile320'] as const).map(vp => ({ lang, theme, vp }))))
/** Screenshot subset (<= 20 PNG overall): login 8 + setup 8 + 4 sidebar. */
const SIDEBAR_SHOTS = new Set(['en-dark-desktop', 'de-light-desktop', 'de-light-mobile320'])

// Expected artwork per theme: dark theme shows the light-on-dark variant.
const FULL = { dark: '/logo-dark.svg', light: '/logo.svg' } as const
const FAVICON = '/favicon.svg'
const FULL_NATURAL = [2172, 724] as const
const FAVICON_NATURAL = [1254, 1254] as const

/** Strict console accounting: EVERY console error and page error is unexpected (no allowances in this file). */
function watch(page: Page, sink: string[]) {
  page.on('console', (m) => { if (m.type() === 'error') sink.push(`console: ${redact(m.text())}`) })
  page.on('pageerror', e => sink.push(`pageerror: ${redact(e.message)}`))
}

async function openAnon(browser: Browser, baseURL: string | undefined, o: { lang: Lang, vp: Vp, path: string, statusMock?: unknown }) {
  const ctx = await browser.newContext({ baseURL, locale: LANGS[o.lang], viewport: VPS[o.vp], storageState: { cookies: [], origins: [] } })
  const page = await ctx.newPage()
  const seen: string[] = []
  watch(page, seen)
  const nonGet: string[] = []
  page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/') && r.method() !== 'GET') nonGet.push(r.method()) })
  if (o.statusMock) await page.route('**/api/auth/oidc/status', route => json(route, o.statusMock))
  await page.goto(o.path)
  return { ctx, page, seen, nonGet }
}

/** Real header/auth theme button + the real <html class="dark"> + a settled render. */
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

interface ImgReport {
  count: number, src: string | null, alt: string | null, complete: boolean, nw: number, nh: number, w: number, h: number,
  inViewport: boolean, clippedBy: number, docOverflow: boolean
}
/** Exactly ONE visible image inside `container` is described (the other theme variant must be display:none). */
async function visibleImage(container: Locator): Promise<ImgReport> {
  const visible = container.locator('img').filter({ visible: true })
  const count = await visible.count()
  if (count === 0) return { count, src: null, alt: null, complete: false, nw: 0, nh: 0, w: 0, h: 0, inViewport: false, clippedBy: 0, docOverflow: false }
  return visible.first().evaluate((img: HTMLImageElement, count: number) => {
    const r = img.getBoundingClientRect()
    let clippedBy = 0
    for (let n = img.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const nr = n.getBoundingClientRect()
      if (r.left < nr.left - 1 || r.right > nr.right + 1 || r.top < nr.top - 1 || r.bottom > nr.bottom + 1) clippedBy++
    }
    return {
      count, src: img.getAttribute('src'), alt: img.getAttribute('alt'), complete: img.complete, nw: img.naturalWidth, nh: img.naturalHeight,
      w: r.width, h: r.height,
      inViewport: r.left >= -1 && r.right <= window.innerWidth + 1 && r.top >= -1 && r.bottom <= window.innerHeight + 1,
      clippedBy,
      docOverflow: !(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.body.scrollWidth <= document.body.clientWidth + 1)
    }
  }, count)
}

/** Shared geometry/loading contract. `box` = exact CSS box (sidebar), `ratio` = width/height (auth). */
function expectImage(r: ImgReport, o: { src: string, natural: readonly [number, number], box?: [number, number], ratio?: number, maxW?: number }) {
  expect(r.count, 'exactly one theme variant is visible').toBe(1)
  expect(r.src, 'visible variant matches the theme').toBe(o.src)
  expect(r.complete, 'image loaded').toBe(true)
  expect([r.nw, r.nh], 'natural size').toEqual([...o.natural])
  if (o.box) { expect(Math.abs(r.w - o.box[0])).toBeLessThanOrEqual(1); expect(Math.abs(r.h - o.box[1])).toBeLessThanOrEqual(1) }
  if (o.ratio) expect(Math.abs(r.w / r.h - o.ratio), 'aspect ratio').toBeLessThanOrEqual(0.05)
  if (o.maxW) expect(r.w).toBeLessThanOrEqual(o.maxW + 1)
  expect(r.w, 'visible size').toBeGreaterThan(20)
  expect(r.inViewport, 'inside the viewport').toBe(true)
  expect(r.clippedBy, 'not clipped by an overflow ancestor').toBe(0)
  expect(r.docOverflow, 'no horizontal document overflow').toBe(false)
}

/** Auth layout brand: the h2 holds the (single visible) logo image. */
async function expectAuthBrand(page: Page, theme: Theme) {
  const h2 = page.locator('h2').filter({ has: page.locator('img') })
  await expect(h2).toHaveCount(1)
  // Both variants are always in the SSR DOM with alt="ezSWM"; CSS shows exactly one, so the h2 name is exactly "ezSWM".
  await expect(h2).toHaveAccessibleName('ezSWM')
  expectImage(await visibleImage(h2), { src: FULL[theme], natural: FULL_NATURAL, ratio: 3, maxW: 288 })
  await expectBrandClearOfThemeButton(page, h2)
}

type Box = { x: number, y: number, width: number, height: number }
/** Two boxes are clear when they are disjoint on at least one axis with `gap` px between them (no intersection, no touching). */
const separated = (a: Box, b: Box, gap = 1) =>
  a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x || a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y

/**
 * The visible logo must not overlap the auth layout's real theme button (the only button named exactly "Switch to
 * light mode" / "Switch to dark mode"). Both are measured with Playwright bounding boxes after hydration; the pair is
 * checked for NON-intersection (not just "inside the viewport"). The product may clear it horizontally OR vertically.
 */
async function expectBrandClearOfThemeButton(page: Page, h2: Locator) {
  const theme = page.getByRole('button', { name: /^Switch to (light|dark) mode$/ })
  await expect(theme, 'exactly one visible theme button').toHaveCount(1)
  await expect(theme).toBeVisible()
  const vp = page.viewportSize()!
  const btn = await theme.boundingBox()
  expect(btn, 'theme button has a box').not.toBeNull()
  expect(btn!.width, 'theme button width').toBeGreaterThan(0)
  expect(btn!.height, 'theme button height').toBeGreaterThan(0)
  expect(btn!.x >= -1 && btn!.x + btn!.width <= vp.width + 1 && btn!.y >= -1 && btn!.y + btn!.height <= vp.height + 1, 'theme button inside the viewport').toBe(true)
  const img = await h2.locator('img').filter({ visible: true }).first().boundingBox()
  expect(img, 'visible logo has a box').not.toBeNull()
  expect(img!.width, 'logo width').toBeGreaterThan(0)
  expect(img!.height, 'logo height').toBeGreaterThan(0)
  expect(separated(img!, btn!), `logo box and theme button box do not intersect (>=1px clear on one axis)`).toBe(true)
}

/** Sidebar header link + image. `scope` = the sidebar (desktop) or the open drawer dialog (mobile). */
const brandLink = (scope: Locator) => scope.getByRole('link', { name: 'ezSWM' })

/** The image box stays centered on both axes within the actual Nuxt UI sidebar header. */
async function expectSidebarBrandCentered(link: Locator) {
  const image = link.locator('img').filter({ visible: true })
  await expect(image).toHaveCount(1)
  const geometry = await image.evaluate((img) => {
    const header = img.closest('[data-slot="header"]')
    if (!header) return null
    const imageBox = img.getBoundingClientRect()
    const headerBox = header.getBoundingClientRect()
    return {
      imageCenterX: imageBox.left + imageBox.width / 2,
      imageCenterY: imageBox.top + imageBox.height / 2,
      headerCenterX: headerBox.left + headerBox.width / 2,
      headerCenterY: headerBox.top + headerBox.height / 2,
      imageLeft: imageBox.left,
      imageRight: imageBox.right,
      imageTop: imageBox.top,
      imageBottom: imageBox.bottom,
      headerLeft: headerBox.left,
      headerRight: headerBox.right,
      headerTop: headerBox.top,
      headerBottom: headerBox.bottom
    }
  })
  expect(geometry, 'visible logo belongs to a rendered sidebar header').not.toBeNull()
  expect(Math.abs(geometry!.imageCenterX - geometry!.headerCenterX), 'logo is horizontally centered').toBeLessThanOrEqual(1)
  expect(Math.abs(geometry!.imageCenterY - geometry!.headerCenterY), 'logo is vertically centered').toBeLessThanOrEqual(1)
  expect(geometry!.imageLeft).toBeGreaterThanOrEqual(geometry!.headerLeft - 1)
  expect(geometry!.imageRight).toBeLessThanOrEqual(geometry!.headerRight + 1)
  expect(geometry!.imageTop).toBeGreaterThanOrEqual(geometry!.headerTop - 1)
  expect(geometry!.imageBottom).toBeLessThanOrEqual(geometry!.headerBottom + 1)
}

async function switchLang(page: Page, lang: Lang) {
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
}
async function restoreEnglish(page: Page, request: import('@playwright/test').APIRequestContext, was: Lang) {
  if (was === 'de') {
    await page.keyboard.press('Escape')
    await switchLang(page, 'en')
  }
  await expect.poll(async () => ((await (await request.get('/api/auth/me')).json()) as { language: string }).language, { message: 'disposable admin language restored' }).toBe('en')
}

test.describe('Logo on the login page (mocked public status, UI only)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  for (const { lang, theme, vp } of MATRIX) {
    test(`[login] one themed logo in the h2, 3:1, no overflow, local form intact (${lang}, ${theme}, ${vp})`, async ({ browser, baseURL }) => {
      expectBase(baseURL, CANDIDATE_BASE)
      const { ctx, page, seen } = await openAnon(browser, baseURL, { lang, vp, path: '/login', statusMock: { enabled: true, provider_name: 'SaarAuth' } })
      await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
      await setTheme(page, theme)
      await expectAuthBrand(page, theme)
      await expect(page.locator('form button[type="submit"]')).toBeVisible()
      await shot(page, `logo-login-${lang}-${theme}-${vp}`)
      await ctx.close()
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }
})

// Project `setup` (fresh OWNED dev instance): the initial wizard is read only here, nothing is typed or submitted.
test.describe('Logo on the setup wizard (fresh owned dev instance, read-only)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  for (const { lang, theme, vp } of MATRIX) {
    test(`[setup] one themed logo in the h2, 3:1, no overflow, GET-only (${lang}, ${theme}, ${vp})`, async ({ browser, baseURL }) => {
      expectBase(baseURL, SETUP_BASE) // before ANY navigation: never the candidate/public/3000
      const { ctx, page, seen, nonGet } = await openAnon(browser, baseURL, { lang, vp, path: '/setup' })
      await expect(page.locator('h1')).toBeVisible()
      await setTheme(page, theme)
      await expectAuthBrand(page, theme)
      await shot(page, `logo-setup-${lang}-${theme}-${vp}`)
      expect(nonGet, 'the wizard page makes no mutating API request').toEqual([])
      await ctx.close()
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }
})

test.describe('Logo in the sidebar header (authenticated admin fixture)', () => {
  for (const { lang, theme, vp } of MATRIX) {
    test(`[sidebar] ${vp === 'desktop' ? 'expanded 144x48 / collapsed 32px emblem' : 'drawer 144x48'} with a stable link name (${lang}, ${theme}, ${vp})`, async ({ page, request, baseURL }) => {
      expectBase(baseURL, CANDIDATE_BASE)
      const seen: string[] = []
      watch(page, seen)
      const key = `${lang}-${theme}-${vp}`
      await page.setViewportSize(VPS[vp])
      try {
        await page.goto('/')
        await expect(page.locator('h1').first()).toBeVisible()
        if (lang === 'de') await switchLang(page, 'de')
        await setTheme(page, theme)
        let scope: Locator
        if (vp === 'mobile320') {
          await page.locator('[data-testid="mobile-menu-button"]').click()
          scope = page.getByRole('dialog')
          await expect(scope).toBeVisible()
        } else {
          scope = page.getByRole('complementary', { name: 'Sidebar navigation' })
        }
        // LOCALIZED navigation proves the language switch landed before any assertion (EN/DE labels of the admin Users entry).
        await expect(scope.locator('a[href="/users"]')).toContainText(lang === 'de' ? 'Benutzer' : 'Users')
        await expect(brandLink(scope)).toHaveCount(1)
        // The mobile drawer slides in: measure only after the image box has stopped moving (3 identical samples). Assertions unchanged.
        let lastBox = ''
        let still = 0
        await expect.poll(async () => {
          const now = JSON.stringify(await brandLink(scope).locator('img').filter({ visible: true }).first().boundingBox())
          still = now === lastBox ? still + 1 : 0
          lastBox = now
          return still
        }, { message: 'brand image position settled' }).toBeGreaterThanOrEqual(3)
        expectImage(await visibleImage(brandLink(scope)), { src: FULL[theme], natural: FULL_NATURAL, box: [144, 48] })
        await expectSidebarBrandCentered(brandLink(scope))
        expect((await visibleImage(brandLink(scope))).alt, 'decorative image (the link carries the name)').toBe('')
        if (SIDEBAR_SHOTS.has(key)) await shot(page, `logo-sidebar-expanded-${key}`)
        if (vp === 'desktop') {
          await scope.getByRole('button', { name: /^(Collapse sidebar|Seitenleiste einklappen)$/ }).click()
          await expect(scope.locator('a[href="/users"]')).toContainText(/^$/)
          await expect(brandLink(scope)).toHaveCount(1)
          expectImage(await visibleImage(brandLink(scope)), { src: FAVICON, natural: FAVICON_NATURAL, box: [32, 32] })
          await expectSidebarBrandCentered(brandLink(scope))
          if (key === 'en-dark-desktop') await shot(page, 'logo-sidebar-collapsed-en-dark-desktop')
          await scope.getByRole('button', { name: /^(Expand sidebar|Seitenleiste erweitern)$/ }).click()
          await expect(scope.locator('a[href="/users"]')).toContainText(lang === 'de' ? 'Benutzer' : 'Users')
        }
      } finally {
        await restoreEnglish(page, request, lang)
      }
      expect(seen, 'unexpected browser console/page errors').toEqual([])
    })
  }
})

test.describe('Logo assets, metadata, brand link, admin navigation', () => {
  // Public artifact data of the pinned PR commit (identical to tests/logoAssets.test.ts); no private values.
  const SVG = /^image\/svg\+xml(?:;|$)/
  const PNG = /^image\/png(?:;|$)/
  const ICO = /^image\/(?:x-icon|vnd\.microsoft\.icon)(?:;|$)/
  const ASSETS = [
    { path: '/logo.svg', type: SVG, sha: '3c55ad1a4b73566647710127c5ef62679658011ecc312540e427d6553a4ad473' },
    { path: '/logo-dark.svg', type: SVG, sha: 'cdeb5e686e0585d7d8bf468ea84adb7c6e41d0fb0a724888c30b08c54fe6f6dc' },
    { path: '/logo.png', type: PNG, sha: '95ebaaa150e8269035e1df0fdd0439ee9d21f1039440724df23c20862b59e8f6' },
    { path: '/favicon.svg', type: SVG, sha: '1f9efc25f8eb074a3f18b431ef6f7710c9c1c339df0b84a531e4deefc71ab929' },
    { path: '/favicon.ico', type: ICO, sha: '58f47b6a0f9f672a858c45bf413f84122005a5e7945e2de083305d6d17cc1fbe' },
    { path: '/apple-touch-icon.png', type: PNG, sha: 'caefa858620ce2e9915cb0d93621a48dc112094242ff955b9312834551cac7d1' },
    { path: '/icon-192.png', type: PNG, sha: 'e41c976b86a9c672b9da338f5a4a2c1b353e8ba4e23f9d9f3b61555c9fd3f7c0' },
    { path: '/icon-512.png', type: PNG, sha: '98ae1c442f5386d8e439c72bac0a3088f92d07ab16813afddf1012534145f0e9' }
  ]

  test('[assets] all 8 served files are the pinned bytes (HTTP 200, no redirect, exact image type)', async ({ request, baseURL }) => {
    expectBase(baseURL, CANDIDATE_BASE)
    // Proves the candidate SERVES the pinned artwork, not merely a file of the right shape. Bodies/headers are never output.
    // Only /apple-touch-icon.png (and the two favicons) are referenced by the head (see [metadata]); /icon-192.png and
    // /icon-512.png are not referenced by the head or a manifest, so only their availability and bytes are asserted (no PWA claim).
    for (const a of ASSETS) {
      const res = await request.get(a.path, { maxRedirects: 0 })
      expect(res.status(), `${a.path} status`).toBe(200)
      expect(res.headers()['content-type'] ?? '', `${a.path} type`).toMatch(a.type)
      expect(createHash('sha256').update(await res.body()).digest('hex'), `${a.path} bytes`).toBe(a.sha)
    }
  })

  test('[metadata] the document head links the SVG/ICO favicons and the 180px touch icon', async ({ browser, baseURL }) => {
    expectBase(baseURL, CANDIDATE_BASE)
    const { ctx, page, seen } = await openAnon(browser, baseURL, { lang: 'en', vp: 'desktop', path: '/login', statusMock: { enabled: false } })
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('head link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1)
    await expect(page.locator('head link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1)
    await expect(page.locator('head link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]')).toHaveCount(1)
    await ctx.close()
    expect(seen).toEqual([])
  })

  test('[brand-link] the sidebar brand link targets the CURRENT site dashboard and navigates there (en, desktop)', async ({ page, request, baseURL }) => {
    expectBase(baseURL, CANDIDATE_BASE)
    const seen: string[] = []
    watch(page, seen)
    await page.setViewportSize(VPS.desktop)
    await page.goto('/')
    const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation' })
    const link = brandLink(sidebar)
    await expect(link).toHaveCount(1)
    // No forced site id: the dashboard href is derived from the real sidebar Switches link (same sitePrefix).
    const switches = await sidebar.locator('a[href$="/switches"]').first().getAttribute('href')
    expect(switches).toMatch(/^\/sites\/[^/]+\/switches$/)
    const expected = switches!.replace(/\/switches$/, '')
    await expect(link).toHaveAttribute('href', expected)
    // The site-uuid-to-slug middleware may canonicalize the URL after navigation: accept ONLY the link's own path or the
    // canonical slug path of the SAME site record (matched by id or slug against the read-only own /api/sites list).
    const segment = expected.split('/')[2]!
    const body = await (await request.get('/api/sites')).json() as unknown
    const sites = (Array.isArray(body) ? body : ((body as { data?: unknown[] }).data ?? [])) as Array<{ id?: string, slug?: string }>
    const rec = sites.find(x => x.id === segment || x.slug === segment)
    expect(rec, 'the link segment belongs to a real site record').toBeDefined()
    const allowed = [expected, ...(rec!.slug ? [`/sites/${rec!.slug}`] : [])]
    await link.click()
    await expect.poll(() => allowed.includes(new URL(page.url()).pathname), { message: 'navigated to the same site dashboard' }).toBe(true)
    expect(seen).toEqual([])
  })

  test('[users-nav] the admin fixture still sees the Users entry next to the new logo header (en, desktop; viewer absence stays covered by users.spec)', async ({ page, baseURL }) => {
    expectBase(baseURL, CANDIDATE_BASE)
    const seen: string[] = []
    watch(page, seen)
    await page.setViewportSize(VPS.desktop)
    await page.goto('/')
    const sidebar = page.getByRole('complementary', { name: 'Sidebar navigation' })
    await expect(brandLink(sidebar)).toHaveCount(1)
    await expect(sidebar.locator('a[href="/users"]')).toBeVisible()
    expect(seen).toEqual([])
  })
})
