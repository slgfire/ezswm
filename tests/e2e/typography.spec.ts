import { test as base, expect, type Page, type Route, type APIRequestContext } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { OidcConfigDto } from '../../types/oidc'

/**
 * Page-title typography, Settings root width and global Sites breadcrumb (UI contract).
 *
 * Pages under test: Data Management, Subnet calculator, Settings, VLAN detail (h1 = 20px / 28px / 700,
 * display font), the Settings root (full main width, no centred max-w-6xl box) and the global
 * `/sites` + `/sites/create` breadcrumbs (leading Dashboard crumb -> '/').
 *
 * Runs against the isolated candidate with a SYNTHETIC admin. Read-only except the REAL-gated
 * fixture (OIDC_E2E_REAL_BRANDING=1): it creates ONE synthetic site and ONE VLAN through the admin API
 * and removes both again. Screenshots are only written when OIDC_E2E_SHOTS_DIR is set.
 * Labels come from the real i18n files (never hard-coded English).
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)
function watch(page: Page, sink: string[]) {
  page.on('console', (m) => {
    if (m.type() === 'error') sink.push(`console: ${redact(m.text())}`)
    if (m.type() === 'warning' && /hydrat/i.test(m.text())) sink.push(`hydration: ${redact(m.text())}`)
  })
  page.on('pageerror', e => sink.push(`pageerror: ${redact(e.message)}`))
}

/** Every test fails on unexpected console/page errors; no deliberate failing requests exist in this file. */
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

const REAL = !!process.env.OIDC_E2E_REAL_BRANDING
const SHOTS = process.env.OIDC_E2E_SHOTS_DIR

type Lang = 'en' | 'de'
const LANGS = ['en', 'de'] as const
const LOCALES: Record<Lang, unknown> = {
  en: JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/en.json'), 'utf8')),
  de: JSON.parse(readFileSync(join(process.cwd(), 'i18n/locales/de.json'), 'utf8'))
}
/** Translate by the real i18n key path (fails loudly when the key is missing). */
const tr = (lang: Lang, key: string): string => {
  let node: unknown = LOCALES[lang]
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  if (typeof node !== 'string') throw new Error(`missing i18n key ${lang}:${key}`)
  return node
}

const VP = {
  wide1920: { width: 1920, height: 1000 },
  desktop: { width: 1440, height: 900 },
  mobile320: { width: 320, height: 640 }
} as const

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const noPageOverflow = (page: Page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  && document.body.scrollWidth <= document.body.clientWidth + 1
  && (() => { const m = document.querySelector('#main-content'); return !m || m.scrollWidth <= m.clientWidth + 1 })())

async function switchLang(page: Page, lang: Lang) {
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem')).toHaveCount(0)
  // Wait for the localized UI (async locale chunk) and the persisted profile language, not just any h1.
  await expect(page.getByRole('button', { name: tr(lang, 'common.language'), exact: true })).toBeVisible()
  await expect(page.locator('h1').first()).toBeVisible()
  await expect.poll(async () => ((await (await page.context().request.get('/api/auth/me')).json()) as { language: string }).language, { message: `profile language persisted as ${lang}` }).toBe(lang)
}
async function restoreEnglish(page: Page, was: Lang) {
  if (was === 'de') await switchLang(page, 'en')
  // The header menu persists the profile language asynchronously: poll with the CURRENT cookies.
  await expect.poll(async () => ((await (await page.context().request.get('/api/auth/me')).json()) as { language: string }).language, { message: 'disposable admin language restored' }).toBe('en')
}
/** Open `path` and switch to `lang` (the language is a profile setting and persists across navigations). */
async function openIn(page: Page, path: string, lang: Lang) {
  await page.goto(path)
  await expect(page.locator('main h1').first()).toBeVisible()
  if (lang === 'de') await switchLang(page, 'de')
}

/** Measured geometry/typography of the page title and its page root (direct child of main#main-content). */
type Geo = {
  main: { left: number, right: number, clientWidth: number, paddingLeft: string, paddingRight: string }
  root: { x: number, w: number, right: number, paddingLeft: string, paddingRight: string, marginLeft: string, maxWidth: string }
  h1: { x: number, y: number, right: number, bottom: number, fontSize: string, lineHeight: string, fontWeight: string, fontFamily: string, letterSpacing: string, text: string }
}
const geo = (page: Page): Promise<Geo> => page.evaluate(() => {
  const main = document.querySelector('#main-content') as HTMLElement
  const h1 = main.querySelector('h1') as HTMLElement
  let root = h1
  while (root.parentElement && root.parentElement !== main) root = root.parentElement
  const mb = main.getBoundingClientRect()
  const mc = getComputedStyle(main)
  const rb = root.getBoundingClientRect()
  const rc = getComputedStyle(root)
  const hb = h1.getBoundingClientRect()
  const hc = getComputedStyle(h1)
  return {
    main: { left: mb.left, right: mb.left + main.clientWidth, clientWidth: main.clientWidth, paddingLeft: mc.paddingLeft, paddingRight: mc.paddingRight },
    root: { x: rb.x, w: rb.width, right: rb.right, paddingLeft: rc.paddingLeft, paddingRight: rc.paddingRight, marginLeft: rc.marginLeft, maxWidth: rc.maxWidth },
    h1: { x: hb.x, y: hb.y, right: hb.right, bottom: hb.bottom, fontSize: hc.fontSize, lineHeight: hc.lineHeight, fontWeight: hc.fontWeight, fontFamily: hc.fontFamily, letterSpacing: hc.letterSpacing, text: (h1.textContent ?? '').trim() }
  }
})

/** The agreed title style (reference = the untouched Sites/Switches/Subnets h1: text-xl font-bold, display font). */
function expectTitleStyle(g: Geo, ref: Geo, label: string) {
  expect(g.h1.fontSize, `${label}: font-size`).toBe('20px')
  expect(g.h1.lineHeight, `${label}: line-height`).toBe('28px')
  expect(g.h1.fontWeight, `${label}: font-weight`).toBe('700')
  expect(g.h1.fontFamily, `${label}: display font`).toContain('JetBrains Mono')
  expect(g.h1.fontFamily, `${label}: same family as the reference title`).toBe(ref.h1.fontFamily)
  expect(g.h1.letterSpacing, `${label}: no tracking override`).toBe('normal')
}

// ---------------------------------------------------------------------------------------------
// Page matrix
// ---------------------------------------------------------------------------------------------
const OIDC_CFG: OidcConfigDto = {
  enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true, scopes: ['openid', 'profile'],
  groups_claim: 'groups', admin_groups: ['ops-alpha'], viewer_groups: ['ops-beta'], allow_unmatched_viewer: false, allow_http_issuer: false,
  observed_groups: [], provider_name: 'SaarAuth', config_revision: 3, updated_at: '2026-01-01T00:00:00.000Z',
  callback_url: 'https://ezswm-typography.example.test/api/auth/oidc/callback',
  encryption_key_ready: true, secret_decryptable: true
}
const mockOidc = (page: Page) => page.route('**/api/auth/oidc/config', route => route.request().method() === 'GET' ? json(route, OIDC_CFG) : json(route, { error: 'unexpected' }, 405))

const PAGES = [
  { id: 'data-management', path: '/data-management', titleKey: 'dataManagement.title' },
  { id: 'subnet-calculator', path: '/tools/subnet-calculator', titleKey: 'tools.subnetCalculator.title' },
  { id: 'settings', path: '/settings', titleKey: 'settings.title' }
] as const

/** Reference title geometry: the Sites list h1 is unchanged (text-xl font-bold inside a p-6 page root). */
async function referenceGeo(page: Page, lang: Lang): Promise<Geo> {
  await page.goto('/sites')
  await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'sites.title'))
  return geo(page)
}

test.describe('Page title typography and page-root padding', () => {
  for (const p of PAGES) {
    for (const lang of LANGS) {
      for (const vpName of ['desktop', 'mobile320'] as const) {
        test(`${p.id} title is 20px/28px/700 display font on a p-6 root (${lang}, ${vpName})`, async ({ page }) => {
          try {
            await page.setViewportSize(VP[vpName])
            await openIn(page, '/sites', lang)
            await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'sites.title'))
            const ref = await geo(page)
            await page.goto(p.path)
            await expect(page.locator('main h1').first()).toHaveText(tr(lang, p.titleKey))
            const g = await geo(page)
            expectTitleStyle(g, ref, `${p.id} ${lang} ${vpName}`)
            expect(g.main.paddingLeft, 'main has no padding; the page root owns it').toBe('0px')
            expect(g.root.paddingLeft, 'page root left padding').toBe('24px')
            expect(g.root.paddingRight, 'page root right padding').toBe('24px')
            expect(Math.abs(g.root.x - g.main.left), 'page root starts at the main left edge').toBeLessThanOrEqual(1)
            expect(Math.abs(g.h1.x - (g.root.x + 24)), 'title sits at the root content edge').toBeLessThanOrEqual(1)
            expect(Math.abs(g.h1.x - ref.h1.x), 'title left edge equals the reference page').toBeLessThanOrEqual(1)
            expect(g.h1.right, 'title inside viewport').toBeLessThanOrEqual(VP[vpName].width + 1)
            expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
          } finally {
            await restoreEnglish(page, lang)
          }
        })
      }
    }
  }
})

// ---------------------------------------------------------------------------------------------
// Settings root: full main width (no centred max-w-6xl), cards and inner form width
// ---------------------------------------------------------------------------------------------
type CardRect = { l: number, r: number, w: number, cls: string }
const cardsOf = (page: Page, selector: string) => page.evaluate((sel) => {
  const main = document.querySelector('#main-content') as HTMLElement
  return [...main.querySelectorAll<HTMLElement>(sel)]
    .filter(el => el.getClientRects().length > 0 && !(sel === 'section' && el.parentElement?.closest('section')))
    .map((el) => {
      const b = el.getBoundingClientRect()
      return { l: b.left, r: b.right, w: b.width, cls: el.tagName.toLowerCase() }
    })
}, selector) as Promise<CardRect[]>

test.describe('Settings root width and cards', () => {
  for (const lang of LANGS) {
    for (const vpName of ['wide1920', 'mobile320'] as const) {
      test(`Settings root fills main, aligns with Sites and keeps card/form widths (${lang}, ${vpName})`, async ({ page }) => {
        try {
          await page.setViewportSize(VP[vpName])
          await mockOidc(page)
          await openIn(page, '/sites', lang)
          const ref = await referenceGeo(page, lang)
          await page.goto('/settings')
          await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'settings.title'))
          const g = await geo(page)
          expectTitleStyle(g, ref, `settings ${lang} ${vpName}`)
          // The main scrollbar (~6px) changes main.clientWidth: compare against the real content width, not an invented number.
          expect(Math.abs(g.root.w - g.main.clientWidth), `root width ${g.root.w} vs main content width ${g.main.clientWidth}`).toBeLessThanOrEqual(1)
          expect(g.root.marginLeft, 'root is not auto-centred').toBe('0px')
          expect(g.root.maxWidth, 'root has no max-width cap').toBe('none')
          if (vpName === 'wide1920') expect(g.root.w, 'wider than the former 6xl (1152px) box').toBeGreaterThan(1152)
          expect(Math.abs(g.root.x - g.main.left), 'root starts at the main left edge').toBeLessThanOrEqual(1)
          expect(g.root.paddingLeft, 'p-6 root').toBe('24px')
          expect(Math.abs(g.h1.x - ref.h1.x), 'title aligned with the Sites reference title').toBeLessThanOrEqual(1)
          if (vpName === 'mobile320') expect(Math.round(g.h1.x), 'mobile title x = 24').toBe(24)

          const contentL = g.root.x + 24
          const contentR = g.root.x + g.root.w - 24
          const tabs: Array<[string, string]> = [
            [tr(lang, 'common.general'), '.list-container'],
            [tr(lang, 'common.account'), '.list-container'],
            [tr(lang, 'settings.oidc.tab'), 'section']
          ]
          for (const [label, selector] of tabs) {
            await page.getByRole('tab', { name: label, exact: true }).click()
            await expect(page.locator(`main ${selector}`).first()).toBeVisible()
            const cards = await cardsOf(page, selector)
            expect(cards.length, `${label}: cards found`).toBeGreaterThan(0)
            for (const c of cards) {
              expect(c.l, `${label}: card left inside root content box`).toBeGreaterThanOrEqual(contentL - 1)
              expect(c.r, `${label}: card right inside root content box`).toBeLessThanOrEqual(contentR + 1)
              expect(c.w, `${label}: card fills the whole root content width`).toBeGreaterThanOrEqual(contentR - contentL - 2)
            }
            if (selector === '.list-container') {
              // General/Account keep the narrow inner form column (max-w-lg = 512px); the card itself spans the page.
              const inner = await page.evaluate(() => {
                const el = [...document.querySelectorAll<HTMLElement>('#main-content .max-w-lg')].find(e => e.getClientRects().length > 0)
                return el ? { w: el.getBoundingClientRect().width } : null
              })
              expect(inner, `${label}: inner max-w-lg form column preserved`).not.toBeNull()
              expect(inner!.w, `${label}: inner column stays <= 512px`).toBeLessThanOrEqual(513)
              if (vpName === 'wide1920') expect(inner!.w, `${label}: inner column narrower than its card`).toBeLessThan(cards[0]!.w - 100)
            }
            expect(await noPageOverflow(page), `${label}: no horizontal overflow`).toBe(true)
          }
          if (vpName === 'mobile320') {
            // Header never collides with the tab list nor leaves the viewport.
            const tablist = await page.getByRole('tablist').first().boundingBox()
            expect(tablist, 'tab list visible').not.toBeNull()
            expect(g.h1.bottom, 'title ends above the tabs').toBeLessThanOrEqual(tablist!.y + 1)
            expect(g.h1.right, 'title inside viewport').toBeLessThanOrEqual(321)
          }
        } finally {
          await restoreEnglish(page, lang)
        }
      })
    }
  }
})

// ---------------------------------------------------------------------------------------------
// Global Sites breadcrumbs (SSR + hydration + navigation)
// ---------------------------------------------------------------------------------------------
function parseCrumbs(rawHtml: string) {
  const html = rawHtml.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const nav = html.match(/<nav[^>]*border-b[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? ''
  const labels = [...nav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => m[1]!.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
  const hrefs = [...nav.matchAll(/<a[^>]*\shref="([^"]*)"/g)].map(m => m[1]!)
  return { html, nav, labels, hrefs }
}
const crumbNav = (page: Page) => page.locator('nav.border-b')
const crumbLabels = (page: Page) => crumbNav(page).locator('li').allInnerTexts().then(a => a.map(s => s.trim()))
const crumbHrefs = (page: Page) => crumbNav(page).locator('a').evaluateAll(els => els.map(e => e.getAttribute('href')))

test.describe('Global Sites breadcrumbs', () => {
  for (const lang of LANGS) {
    test(`/sites is server-rendered with Dashboard > Sites and a root Dashboard link (${lang})`, async ({ page }) => {
      try {
        await openIn(page, '/sites', lang)
        const res = await page.context().request.get('/sites', { headers: { accept: 'text/html' } })
        expect(res.status()).toBe(200)
        const c = parseCrumbs(await res.text())
        expect(c.nav, 'breadcrumb rendered on the server').not.toBe('')
        expect(c.labels).toEqual([tr(lang, 'nav.dashboard'), tr(lang, 'nav.sites')])
        expect(c.hrefs, 'only the Dashboard crumb is a link; the current page is plain text').toEqual(['/'])
        expect(c.html).toContain(`>${tr(lang, 'sites.title')}</h1>`)
      } finally {
        await restoreEnglish(page, lang)
      }
    })
    for (const vpName of ['desktop', 'mobile320'] as const) {
      test(`/sites hydrates with two crumbs, no overflow and an unchanged reference title (${lang}, ${vpName})`, async ({ page }) => {
        try {
          await page.setViewportSize(VP[vpName])
          await openIn(page, '/sites', lang)
          await expect(crumbNav(page)).toBeVisible()
          expect(await crumbLabels(page)).toEqual([tr(lang, 'nav.dashboard'), tr(lang, 'nav.sites')])
          expect(await crumbHrefs(page)).toEqual(['/'])
          await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'sites.title'))
          const g = await geo(page)
          expect([g.h1.fontSize, g.h1.lineHeight, g.h1.fontWeight], 'reference title untouched').toEqual(['20px', '28px', '700'])
          expect(g.root.paddingLeft).toBe('24px')
          expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
          const nav = await crumbNav(page).boundingBox()
          expect(nav!.x + nav!.width, 'breadcrumb inside viewport').toBeLessThanOrEqual(VP[vpName].width + 1)
        } finally {
          await restoreEnglish(page, lang)
        }
      })
      test(`/sites/create shows Dashboard > Sites > Create with translated labels, SSR and hydrated (${lang}, ${vpName})`, async ({ page }) => {
        try {
          await page.setViewportSize(VP[vpName])
          await openIn(page, '/sites/create', lang)
          const expected = [tr(lang, 'nav.dashboard'), tr(lang, 'nav.sites'), tr(lang, 'common.create')]
          await expect(crumbNav(page)).toBeVisible()
          expect(await crumbLabels(page)).toEqual(expected)
          expect(await crumbHrefs(page), 'Dashboard and Sites are links; Create is the current page').toEqual(['/', '/sites'])
          await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'sites.create'))
          expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
          const res = await page.context().request.get('/sites/create', { headers: { accept: 'text/html' } })
          expect(res.status()).toBe(200)
          const c = parseCrumbs(await res.text())
          expect(c.labels, 'server-rendered labels match the hydrated ones').toEqual(expected)
          expect(c.hrefs).toEqual(['/', '/sites'])
        } finally {
          await restoreEnglish(page, lang)
        }
      })
    }
  }
})

// ---------------------------------------------------------------------------------------------
// REAL candidate fixture: one synthetic site + one VLAN (created through the admin API, removed afterwards)
// ---------------------------------------------------------------------------------------------
test.describe('Typography checks with a synthetic site and VLAN (real candidate)', () => {
  test.skip(!REAL, 'OIDC_E2E_REAL_BRANDING not set (isolated candidate with synthetic data only)')

  const vlanNumber = 2000 + Math.floor(Math.random() * 1900)
  const siteName = `Typography check site ${Date.now().toString(36)}`
  let siteId = ''
  let vlanId = ''

  test.beforeAll(async ({ request, baseURL }) => {
    // Never mutate anything but the isolated candidate.
    expect(baseURL, 'REAL fixture only runs against the isolated candidate origin').toBe('http://127.0.0.1:3105')
    try {
      const site = await request.post('/api/sites', { data: { name: siteName } })
      expect(site.ok(), 'synthetic site created').toBe(true)
      siteId = ((await site.json()) as { id: string }).id
      // Explicit palette colour (hex) so the create never depends on the auto-assign pool.
      const vlan = await request.post('/api/vlans', { data: { site_id: siteId, vlan_id: vlanNumber, name: 'Typography check', status: 'active', color: '#2563EB' } })
      expect(vlan.ok(), 'synthetic VLAN created').toBe(true)
      vlanId = ((await vlan.json()) as { id: string }).id
    } catch (e) {
      await cleanup(request) // partial setup must not leave the fixture behind
      throw e
    }
  })
  /** Best-effort delete of BOTH owned records (VLAN first), then verify; throws if anything is left. */
  async function cleanup(request: APIRequestContext) {
    const failures: string[] = []
    if (vlanId) {
      const r = await request.delete(`/api/vlans/${vlanId}`)
      if (!r.ok()) failures.push(`vlan delete status ${r.status()}`)
    }
    if (siteId) {
      const r = await request.delete(`/api/sites/${siteId}`)
      if (!r.ok()) failures.push(`site delete status ${r.status()}`)
    }
    if (siteId) {
      const g = await request.get(`/api/sites/${siteId}`)
      if (g.status() !== 404) failures.push(`site still readable (status ${g.status()})`)
    }
    if (vlanId) {
      const g = await request.get(`/api/vlans/${vlanId}`)
      if (g.status() !== 404) failures.push(`vlan still readable (status ${g.status()})`)
    }
    vlanId = ''
    siteId = ''
    expect(failures, 'synthetic fixture removed').toEqual([])
  }
  test.afterAll(async ({ request }) => {
    await cleanup(request)
  })

  const vlanPath = () => `/sites/${siteId}/vlans/${vlanId}`

  for (const lang of LANGS) {
    for (const vpName of ['desktop', 'mobile320'] as const) {
      test(`vlan-detail title is 20px/28px/700 display font on a p-6 root with intact back button (${lang}, ${vpName})`, async ({ page }) => {
        try {
          await page.setViewportSize(VP[vpName])
          await openIn(page, '/sites', lang)
          const ref = await geo(page)
          await page.goto(vlanPath())
          const title = page.locator('main h1').first()
          await expect(title).toContainText(`VLAN ${vlanNumber} - Typography check`)
          const g = await geo(page)
          expectTitleStyle(g, ref, `vlan-detail ${lang} ${vpName}`)
          expect(g.root.paddingLeft, 'page root left padding').toBe('24px')
          expect(g.root.paddingRight, 'page root right padding').toBe('24px')
          expect(Math.abs(g.root.x - g.main.left), 'page root starts at the main left edge').toBeLessThanOrEqual(1)
          // The title is preceded by the back arrow (and a swatch inside the h1): only the font is compared, not x.
          const back = page.locator(`main a[href="/sites/${siteId}/vlans"]`).first()
          await expect(back).toBeVisible()
          const bb = await back.boundingBox()
          expect(Math.abs(bb!.x - (g.root.x + 24)), 'back button at the root content edge').toBeLessThanOrEqual(1)
          expect(g.h1.x, 'title starts after the back button (no overlap)').toBeGreaterThanOrEqual(bb!.x + bb!.width - 1)
          expect(g.h1.right, 'title inside viewport').toBeLessThanOrEqual(VP[vpName].width + 1)
          expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
        } finally {
          await restoreEnglish(page, lang)
        }
      })
    }
  }

  for (const lang of LANGS) {
    test(`global Dashboard crumb on /sites links to '/' and navigates to the first site (id or canonical slug) (${lang})`, async ({ page }) => {
      try {
        const listRes = await page.context().request.get('/api/sites')
        const body = await listRes.json() as { id: string, slug: string }[] | { data?: { id: string, slug: string }[] }
        const sites = Array.isArray(body) ? body : (body.data ?? [])
        expect(sites.length, 'at least the synthetic site exists').toBeGreaterThan(0)
        await openIn(page, '/sites', lang)
        const dashboard = crumbNav(page).locator('a[href="/"]')
        await expect(dashboard).toHaveCount(1)
        await expect(dashboard).toHaveText(tr(lang, 'nav.dashboard'))
        await dashboard.click()
        // '/' redirects client-side to /sites/<first site id>; the global site-uuid-to-slug middleware then canonicalises it to the slug.
        const first = sites[0]!
        await page.waitForURL(url => [first.id, first.slug].some(seg => url.pathname === `/sites/${seg}`), { timeout: 15000 })
        await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'nav.dashboard'))
        // Site dashboard: a single Dashboard crumb stays hidden.
        await expect(crumbNav(page)).toHaveCount(0)
      } finally {
        await restoreEnglish(page, lang)
      }
    })
  }

  test('site-scoped routes keep their breadcrumbs: dashboard hidden, Switches path override unchanged', async ({ page }) => {
    await page.goto(`/sites/${siteId}`)
    await expect(page.locator('main h1').first()).toHaveText(tr('en', 'nav.dashboard'))
    await expect(crumbNav(page), 'one crumb => hidden').toHaveCount(0)
    await page.goto(`/sites/${siteId}/switches`)
    await expect(page.locator('main h1').first()).toHaveText(tr('en', 'switches.title'))
    await expect(crumbNav(page)).toBeVisible()
    expect(await crumbLabels(page)).toEqual([tr('en', 'nav.dashboard'), tr('en', 'nav.switches')])
    expect(await crumbHrefs(page), 'Dashboard links to the site dashboard (siteId branch unchanged)').toEqual([`/sites/${siteId}`])
  })

  // ---- screenshots (VLAN detail reference) ----
  test.describe('VLAN detail screenshots', () => {
    test.skip(!SHOTS, 'OIDC_E2E_SHOTS_DIR not set')
    for (const vpName of ['desktop', 'mobile320'] as const) {
      test(`vlan detail screenshot (${vpName})`, async ({ page }) => {
        await page.setViewportSize(VP[vpName])
        await page.goto(vlanPath())
        await expect(page.locator('main h1').first()).toContainText(`VLAN ${vlanNumber}`)
        mkdirSync(SHOTS!, { recursive: true })
        await page.screenshot({ path: join(SHOTS!, `typography-vlan-detail-en-${vpName}.png`) })
      })
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Screenshots (no real data mutated). Data Management, Calculator, Settings General/Account/SSO at wide + 320, EN/DE; Sites roots.
// ---------------------------------------------------------------------------------------------
test.describe('Typography screenshots', () => {
  test.skip(!SHOTS, 'OIDC_E2E_SHOTS_DIR not set')
  const shot = (page: Page, name: string) => { mkdirSync(SHOTS!, { recursive: true }); return page.screenshot({ path: join(SHOTS!, `typography-${name}.png`) }) }

  for (const lang of LANGS) {
    for (const vpName of ['wide1920', 'mobile320'] as const) {
      for (const p of PAGES.filter(x => x.id !== 'settings')) {
        test(`${p.id} screenshot (${lang}, ${vpName})`, async ({ page }) => {
          try {
            await page.setViewportSize(VP[vpName])
            await openIn(page, p.path, lang)
            await expect(page.locator('main h1').first()).toHaveText(tr(lang, p.titleKey))
            await shot(page, `${p.id}-${lang}-${vpName}`)
          } finally {
            await restoreEnglish(page, lang)
          }
        })
      }
      for (const [tabId, tabKey] of [['general', 'common.general'], ['account', 'common.account'], ['sso', 'settings.oidc.tab']] as const) {
        test(`settings ${tabId} screenshot (${lang}, ${vpName})`, async ({ page }) => {
          try {
            await page.setViewportSize(VP[vpName])
            await mockOidc(page)
            await openIn(page, '/settings', lang)
            await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'settings.title'))
            await page.getByRole('tab', { name: tr(lang, tabKey), exact: true }).click()
            await expect(page.locator(tabId === 'sso' ? 'main section' : 'main .list-container').first()).toBeVisible()
            await shot(page, `settings-${tabId}-${lang}-${vpName}`)
          } finally {
            await restoreEnglish(page, lang)
          }
        })
      }
    }
    for (const vpName of ['desktop', 'mobile320'] as const) {
      for (const [id, path] of [['sites', '/sites'], ['sites-create', '/sites/create']] as const) {
        test(`${id} breadcrumb screenshot (${lang}, ${vpName})`, async ({ page }) => {
          try {
            await page.setViewportSize(VP[vpName])
            await openIn(page, path, lang)
            await expect(crumbNav(page)).toBeVisible()
            await shot(page, `${id}-${lang}-${vpName}`)
          } finally {
            await restoreEnglish(page, lang)
          }
        })
      }
    }
  }
})
