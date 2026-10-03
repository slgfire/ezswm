import { test as base, expect, type Browser, type APIRequestContext, type Page, type Route } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { OidcConfigDto } from '../../types/oidc'

/**
 * Settings cards UI contract (General + Account tabs).
 *
 * - General: ONE section heading (h2, 14px caps) + TWO full-width cards (Basic settings / Optional features,
 *   normal 16px h3 + icon + hint, compact max-w-lg fields) inside ONE form with ONE submit.
 * - Account: ONE section heading (h2) + Profile card + (local) Password card or (OIDC) managed banner; the
 *   profile and password forms are separate forms/handlers.
 *
 * Backend semantics are NOT proven by the mocked tests (they prove UI wiring + the exact PUT payload the UI sends).
 * Backend proof is the single REAL-gated test (OIDC_E2E_REAL_BRANDING=1, isolated candidate 127.0.0.1:3105 only),
 * which saves the four General settings through the UI, reloads, and restores the original values.
 * Persona tests (OIDC admin, local viewer) log in through the real login form against a MOCKED /api/auth/login
 * response in a cookie-less context; every other /api GET is proxied read-only through the authenticated request
 * fixture and every non-GET is blocked. UI-only evidence (role gating is enforced by the server elsewhere).
 * Labels come from the real i18n files. Screenshots are only written when OIDC_E2E_SHOTS_DIR is set.
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)
function watch(page: Page, sink: string[]) {
  page.on('console', (m) => {
    if (m.type() === 'error') sink.push(`console: ${redact(m.text())}`)
    if (m.type() === 'warning' && /hydrat/i.test(m.text())) sink.push(`hydration: ${redact(m.text())}`)
  })
  page.on('pageerror', e => sink.push(`pageerror: ${redact(e.message)}`))
}

/**
 * Console guard. Only ONE kind of event can ever be allowed: the browser's own resource-failure console error
 * ("Failed to load resource: the server responded with a status of <N> ...") whose HTTP status AND exact request
 * pathname (from console.location(), query stripped) match a descriptor registered by the test through
 * allowHttpError(). pageerror, hydration warnings, network errors, dynamic-import errors and every other console
 * message are never allowed. Persona contexts use the strict `watch` above (no allowances at all).
 */
type GuardEvent = { kind: 'console-error' | 'hydration' | 'pageerror', text: string, pathname: string | null }
type HttpAllowance = { status: number, pathname: string }
const RESOURCE_FAILURE = /^Failed to load resource: the server responded with a status of (\d{3})\b/

function isAllowedEvent(ev: GuardEvent, allowances: HttpAllowance[]): boolean {
  if (ev.kind !== 'console-error' || ev.pathname === null) return false
  const m = RESOURCE_FAILURE.exec(ev.text)
  if (!m) return false
  return allowances.some(a => a.status === Number(m[1]) && a.pathname === ev.pathname)
}
function watchEvents(page: Page, sink: GuardEvent[]) {
  page.on('console', (m) => {
    if (m.type() === 'error') {
      let pathname: string | null = null
      try { pathname = new URL(m.location().url).pathname } catch { /* no usable location */ }
      sink.push({ kind: 'console-error', text: m.text().slice(0, 300), pathname })
    }
    if (m.type() === 'warning' && /hydrat/i.test(m.text())) sink.push({ kind: 'hydration', text: m.text().slice(0, 300), pathname: null })
  })
  page.on('pageerror', e => sink.push({ kind: 'pageerror', text: e.message.slice(0, 300), pathname: null }))
}
const HTTP_ANNOTATION = 'expect-http-error'
/** Declare ONE expected HTTP failure (exact status + exact pathname) for the current test. */
const allowHttpError = (status: number, pathname: string) =>
  test.info().annotations.push({ type: HTTP_ANNOTATION, description: JSON.stringify({ status, pathname } satisfies HttpAllowance) })

const test = base.extend<{ consoleGuard: undefined }>({
  consoleGuard: [async ({ page }, use, testInfo) => {
    const seen: GuardEvent[] = []
    watchEvents(page, seen)
    await use(undefined)
    const allowances = testInfo.annotations.filter(a => a.type === HTTP_ANNOTATION).map(a => JSON.parse(a.description ?? '{}') as HttpAllowance)
    const unexpected = seen.filter(ev => !isAllowedEvent(ev, allowances))
    const render = (ev: GuardEvent) => `${ev.kind}${ev.pathname ? ` ${ev.pathname}` : ''}: ${redact(ev.text)}`
    await testInfo.attach('browser-console.txt', { body: seen.length ? seen.map(render).join('\n') : '(no console errors or page errors)', contentType: 'text/plain' })
    expect(unexpected.map(render), 'unexpected browser console/page errors').toEqual([])
    for (const a of allowances) {
      expect(seen.some(ev => isAllowedEvent(ev, [a])), `expected HTTP ${a.status} on ${a.pathname} was observed`).toBe(true)
    }
  }, { auto: true }]
})

const REAL = !!process.env.OIDC_E2E_REAL_BRANDING
const SHOTS = process.env.OIDC_E2E_SHOTS_DIR
const CANDIDATE = 'http://127.0.0.1:3105'

type Lang = 'en' | 'de'
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
  desktop: { width: 1440, height: 900 },
  mobile320: { width: 320, height: 640 }
} as const
type VpName = keyof typeof VP

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const noPageOverflow = (page: Page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  && document.body.scrollWidth <= document.body.clientWidth + 1
  && (() => { const m = document.querySelector('#main-content'); return !m || m.scrollWidth <= m.clientWidth + 1 })())

// ---------------------------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------------------------
const OIDC_CFG: OidcConfigDto = {
  enabled: true, issuer: 'https://idp.example.com', client_id: 'ezswm', client_secret_configured: true, scopes: ['openid', 'profile'],
  groups_claim: 'groups', admin_groups: ['ops-alpha'], viewer_groups: ['ops-beta'], allow_unmatched_viewer: false, allow_http_issuer: false,
  observed_groups: [], provider_name: 'SaarAuth', config_revision: 3, updated_at: '2026-01-01T00:00:00.000Z',
  callback_url: 'https://ezswm-cards.example.test/api/auth/oidc/callback',
  encryption_key_ready: true, secret_decryptable: true
}
/** Read-only mock: any write fails the test (405 -> console error) and is recorded by trackWrites. */
const mockOidc = (target: Page) =>
  target.route('**/api/auth/oidc/config', route => route.request().method() === 'GET' ? json(route, OIDC_CFG) : json(route, { error: 'unexpected' }, 405))

const GENERAL_KEYS = ['app_name', 'default_port_status', 'patch_panels_enabled', 'switch_groups_enabled'] as const
type GeneralValues = { app_name: string, default_port_status: 'up' | 'down' | 'disabled', patch_panels_enabled: boolean, switch_groups_enabled: boolean }

/** Stateful GET/PUT /api/settings mock (returns the whole settings object, like the real API; no envelope). */
async function mockSettings(page: Page, initial: GeneralValues, opts: { failPut?: () => boolean } = {}) {
  const state = {
    app_logo_url: null, default_vlan: null, port_speeds: ['100M', '1G', '2.5G', '10G', '100G'],
    setup_completed: true, sites_initialized: true, ...initial
  } as Record<string, unknown>
  const puts: Record<string, unknown>[] = []
  let gets = 0
  await page.route('**/api/settings', async (route) => {
    const method = route.request().method()
    if (method === 'GET') { gets++; return json(route, state) }
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      puts.push(body)
      if (opts.failPut?.()) return json(route, { statusCode: 500, message: 'Mocked failure' }, 500)
      Object.assign(state, body)
      return json(route, state)
    }
    return json(route, { error: 'unexpected' }, 405)
  })
  return { state, puts, gets: () => gets }
}
const MOCK_GENERAL: GeneralValues = { app_name: 'Mock Switch Hub', default_port_status: 'down', patch_panels_enabled: false, switch_groups_enabled: true }

/** Records every non-GET /api request the browser makes (mocked or not). */
function trackWrites(page: Page) {
  const writes: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/') && r.method() !== 'GET') writes.push(`${r.method()} ${u.pathname}`)
  })
  return writes
}

/** Account mocks: profile + password writes are fulfilled locally, nothing reaches the real server. */
async function mockUserWrites(page: Page) {
  const calls: { method: string, path: string, body: Record<string, unknown> }[] = []
  let passwordStatus = 200
  await page.route('**/api/users/**', async (route) => {
    const r = route.request()
    const path = new URL(r.url()).pathname
    if (r.method() === 'PUT' && /^\/api\/users\/[^/]+(\/password)?$/.test(path)) {
      calls.push({ method: 'PUT', path, body: r.postDataJSON() as Record<string, unknown> })
      if (path.endsWith('/password') && passwordStatus !== 200) return json(route, { statusCode: passwordStatus, message: 'Mocked wrong password' }, passwordStatus)
      return json(route, path.endsWith('/password') ? { success: true } : {})
    }
    return route.fallback()
  })
  return { calls, setPasswordStatus: (s: number) => { passwordStatus = s } }
}

// ---------------------------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------------------------
/** Switch the UI language through the header menu. Persistence (PUT /api/users/:id) must be mocked by the caller. */
async function switchLang(page: Page, lang: Lang) {
  if (lang === 'en') return
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: 'Deutsch' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: tr(lang, 'common.language'), exact: true })).toBeVisible()
}
/** Open /settings as the (real, English) admin, optionally switch to German WITHOUT persisting, and open a tab. */
async function openSettings(page: Page, lang: Lang, vp: VpName, tabKey: 'common.general' | 'common.account') {
  await page.setViewportSize(VP[vp])
  await mockOidc(page)
  // The header persists the language with PUT /api/users/:id; keep it local so the real admin profile is never touched.
  if (lang === 'de') await page.route('**/api/users/*', route => route.request().method() === 'PUT' ? json(route, {}) : route.fallback())
  await page.goto('/settings')
  await expect(page.locator('main h1').first()).toBeVisible()
  await switchLang(page, lang)
  await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'settings.title'))
  if (lang === 'de') {
    // Mount-time accessible names (USwitch) follow the locale at mount: remount through a normal reload in the selected
    // (cookie-persisted) header language. This does not claim that already-mounted switch names update dynamically.
    await page.reload()
    await expect(page.locator('main h1').first()).toHaveText(tr(lang, 'settings.title'))
  }
  await page.getByRole('tab', { name: tr(lang, tabKey), exact: true }).click()
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
}

type Persona = { role: 'admin' | 'viewer', auth_provider: 'local' | 'oidc', language: Lang }
const personaUser = (p: Persona) => ({
  id: 'persona-user-0001', username: 'mock.persona', display_name: 'Mock Persona', role: p.role, language: p.language,
  is_setup_user: false, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  auth_provider: p.auth_provider, oidc_issuer: p.auth_provider === 'oidc' ? 'https://idp.example.com' : null,
  oidc_subject: p.auth_provider === 'oidc' ? 'mock-subject' : null, oidc_session_version: 0
})

/**
 * Persona page: cookie-less context, login through the real form against a MOCKED login response (normal client auth
 * path: useAuth.login sets the user), then CLIENT-SIDE navigation to /settings via the header user menu (no reload, so
 * SSR never replaces the mocked user). Other GETs are proxied read-only; non-GETs are blocked and recorded.
 */
async function openPersona(browser: Browser, request: APIRequestContext, baseURL: string | undefined, p: Persona, vp: VpName) {
  const ctx = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] }, viewport: VP[vp] })
  const page = await ctx.newPage()
  const seen: string[] = []
  const blocked: string[] = []
  watch(page, seen)
  let user = personaUser(p)
  await ctx.route('**/api/**', async (route) => {
    const r = route.request()
    const path = new URL(r.url()).pathname
    if (path === '/api/auth/login' && r.method() === 'POST') return json(route, { user, token: 'mock-session' })
    if (path === '/api/auth/me') return json(route, user)
    if (path === '/api/auth/oidc/config' && r.method() === 'GET') return json(route, OIDC_CFG)
    // Only known mock-persona locale write: the header language menu persists with PUT /api/users/:id (self, language only).
    if (r.method() === 'PUT' && path === `/api/users/${user.id}`) {
      const body = r.postDataJSON() as Record<string, unknown> | null
      if (body && Object.keys(body).length === 1 && body.language === 'de') {
        user = { ...user, language: 'de' }
        return json(route, user)
      }
    }
    if (r.method() !== 'GET') { blocked.push(`${r.method()} ${path}`); return json(route, { error: 'blocked' }, 405) }
    const res = await request.fetch(r.url(), { headers: { accept: r.headers().accept ?? '*/*' } })
    return route.fulfill({ response: res })
  })
  await page.goto('/login')
  await page.locator('input[autocomplete="username"]').fill('mock.persona')
  await page.locator('input[autocomplete="current-password"]').fill('mock-password-1')
  await page.locator('form button[type="submit"]').click()
  const userMenu = page.locator('button:has([class*="user-circle"])').first()
  await expect(userMenu).toBeVisible()
  // The persona's stored language is not auto-applied on load (known pre-existing gap): select it via the supported header menu.
  await switchLang(page, p.language)
  await expect(page.getByRole('button', { name: tr(p.language, 'common.language'), exact: true })).toBeVisible()
  await userMenu.click()
  await page.getByRole('menuitem', { name: tr(p.language, 'nav.settings'), exact: true }).click()
  await expect(page.locator('main h1').first()).toHaveText(tr(p.language, 'settings.title'))
  return { ctx, page, seen, blocked }
}
async function closePersona(h: { ctx: { close(): Promise<void> }, seen: string[], blocked: string[] }) {
  await h.ctx.close()
  expect(h.blocked, 'persona pages never issue writes').toEqual([])
  expect(h.seen, 'unexpected browser console/page errors (persona page)').toEqual([])
}

// ---------------------------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------------------------
type Box = { l: number, r: number, t: number, b: number, w: number }
type HeadingM = Box & { level: number, text: string, fontSize: string, fontWeight: string, textTransform: string, letterSpacing: string }
type CardM = Box & { title: string, cls: string, hasIcon: boolean, hint: string, hintGap: number | null, listContainer: boolean }
type FieldM = Box & { role: string, formIndex: number, cardIndex: number }
type Measured = {
  panelCount: number
  root: { x: number, w: number, paddingLeft: string, paddingRight: string }
  main: { clientWidth: number }
  headings: HeadingM[]
  cards: CardM[]
  listContainers: number
  forms: number
  nestedForms: number
  submits: (Box & { formIndex: number })[]
  fields: FieldM[]
  passwords: Box[]
  labels: (Box & { text: string, clipped: boolean, textOverflow: string, cardIndex: number })[]
}

const measure = (page: Page): Promise<Measured> => page.evaluate(() => {
  const vis = (e: Element) => (e as HTMLElement).getClientRects().length > 0
  const box = (e: Element) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width } }
  const main = document.querySelector('#main-content') as HTMLElement
  const h1 = main.querySelector('h1') as HTMLElement
  let root: HTMLElement = h1
  while (root.parentElement && root.parentElement !== main) root = root.parentElement
  const rb = root.getBoundingClientRect()
  const rc = getComputedStyle(root)
  const panels = [...main.querySelectorAll<HTMLElement>('[role="tabpanel"]')].filter(vis)
  const panel = panels[0] ?? main
  const forms = [...panel.querySelectorAll('form')].filter(vis)
  const icons = 'span[class*="i-lucide"], span[class*="i-heroicons"], svg'
  const h3s = [...panel.querySelectorAll<HTMLElement>('h3')].filter(vis)
  const cardEls: HTMLElement[] = []
  const cards = h3s.map((h3) => {
    const card = (h3.closest('.list-container, .rounded-xl') ?? h3.parentElement) as HTMLElement
    cardEls.push(card)
    const icon = [...card.querySelectorAll(icons)].find(i => vis(i) && i.getBoundingClientRect().width > 0 && (h3.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_PRECEDING))
    const hintEl = [...card.querySelectorAll('p')].find(p => (h3.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) && vis(p))
    return {
      ...box(card), title: (h3.textContent ?? '').trim(), cls: card.className,
      hasIcon: !!icon, hint: (hintEl?.textContent ?? '').trim(),
      hintGap: hintEl ? hintEl.getBoundingClientRect().top - h3.getBoundingClientRect().bottom : null,
      listContainer: card.classList.contains('list-container')
    }
  })
  const cardIndexOf = (e: Element) => cardEls.findIndex(c => c.contains(e))
  const headings = [...panel.querySelectorAll<HTMLElement>('h2, h3')].filter(vis).map((h) => {
    const c = getComputedStyle(h)
    return { ...box(h), level: Number(h.tagName[1]), text: (h.textContent ?? '').trim(), fontSize: c.fontSize, fontWeight: c.fontWeight, textTransform: c.textTransform, letterSpacing: c.letterSpacing }
  })
  const fields = [...panel.querySelectorAll<HTMLElement>('input:not([type="hidden"]):not([readonly]), textarea, [role="combobox"], [role="switch"]')]
    .filter(e => vis(e) && e.getAttribute('aria-hidden') !== 'true')
    .map(e => ({ ...box(e), role: e.getAttribute('role') ?? e.tagName.toLowerCase(), formIndex: forms.indexOf(e.closest('form') as HTMLFormElement), cardIndex: cardIndexOf(e) }))
  const labels = [...panel.querySelectorAll<HTMLElement>('label')].filter(vis).map(l => ({
    ...box(l), text: (l.textContent ?? '').trim(), clipped: l.scrollWidth > l.clientWidth + 1, textOverflow: getComputedStyle(l).textOverflow, cardIndex: cardIndexOf(l)
  }))
  return {
    panelCount: panels.length,
    root: { x: rb.x, w: rb.width, paddingLeft: rc.paddingLeft, paddingRight: rc.paddingRight },
    main: { clientWidth: main.clientWidth },
    headings, cards,
    listContainers: [...panel.querySelectorAll('.list-container')].filter(vis).length,
    forms: forms.length,
    nestedForms: panel.querySelectorAll('form form').length,
    submits: [...panel.querySelectorAll<HTMLElement>('button[type="submit"]')].filter(vis).map(b => ({ ...box(b), formIndex: forms.indexOf(b.closest('form') as HTMLFormElement) })),
    fields,
    passwords: [...panel.querySelectorAll<HTMLElement>('input[type="password"]')].filter(vis).map(box),
    labels
  }
})

type Kind = 'general' | 'account-local' | 'account-oidc'
const expectedHeadings = (lang: Lang, kind: Kind): [number, string][] => kind === 'general'
  ? [[2, tr(lang, 'common.general')], [3, tr(lang, 'settings.general.basicTitle')], [3, tr(lang, 'settings.general.featuresTitle')]]
  : [[2, tr(lang, 'common.account')], [3, tr(lang, 'settings.account.profileTitle')], [3, tr(lang, kind === 'account-local' ? 'settings.account.changePassword' : 'settings.account.oidcManagedTitle')]]

/** Shared structural + typography + geometry contract for one tab panel. */
function expectCards(m: Measured, lang: Lang, kind: Kind, vp: VpName, label: string) {
  const vpW = VP[vp].width
  expect(m.panelCount, `${label}: exactly one visible tab panel`).toBe(1)
  expect(m.root.paddingLeft, `${label}: p-6 root left`).toBe('24px')
  expect(m.root.paddingRight, `${label}: p-6 root right`).toBe('24px')

  // Headings: exactly one h2 section heading followed by two h3 card titles (no skipped levels, translated text).
  expect(m.headings.map(h => [h.level, h.text]), `${label}: heading outline`).toEqual(expectedHeadings(lang, kind))
  const [h2, ...h3s] = m.headings
  expect(h2!.fontSize, `${label}: section heading 14px`).toBe('14px')
  expect(h2!.textTransform, `${label}: section heading is caps`).toBe('uppercase')
  expect(h2!.letterSpacing, `${label}: section heading is tracked`).not.toBe('normal')
  expect(Number(h2!.fontWeight), `${label}: section heading weight`).toBeGreaterThanOrEqual(600)
  for (const h of h3s) {
    expect(h.fontSize, `${label}: card title "${h.text}" is 16px`).toBe('16px')
    expect(h.textTransform, `${label}: card title "${h.text}" is normal case`).toBe('none')
    expect(h.letterSpacing, `${label}: card title "${h.text}" untracked`).toBe('normal')
    expect(Number(h.fontWeight), `${label}: card title weight`).toBeGreaterThanOrEqual(600)
  }
  expect(h2!.b, `${label}: section heading above the first card`).toBeLessThanOrEqual(m.cards[0]!.t + 1)

  // Cards: two, stacked, each fullwidth within the root content box, with icon + hint under a normal title.
  expect(m.cards.length, `${label}: two cards`).toBe(2)
  expect(m.listContainers, `${label}: .list-container cards`).toBe(kind === 'account-oidc' ? 1 : 2)
  const contentL = m.root.x + 24
  const contentR = m.root.x + m.root.w - 24
  for (const c of m.cards) {
    expect(c.l, `${label}: "${c.title}" left in root content`).toBeGreaterThanOrEqual(contentL - 1)
    expect(c.r, `${label}: "${c.title}" right in root content`).toBeLessThanOrEqual(contentR + 1)
    expect(c.w, `${label}: "${c.title}" spans the full content width`).toBeGreaterThanOrEqual(contentR - contentL - 2)
    expect(c.hasIcon, `${label}: "${c.title}" has an icon before its title`).toBe(true)
    expect(c.hint.length, `${label}: "${c.title}" has a hint`).toBeGreaterThan(0)
    expect(c.hintGap, `${label}: "${c.title}" hint sits right under the title`).not.toBeNull()
    expect(c.hintGap!, `${label}: hint gap`).toBeGreaterThanOrEqual(-1)
    expect(c.hintGap!, `${label}: hint gap`).toBeLessThanOrEqual(40)
  }
  expect(m.cards[1]!.t, `${label}: second card is below the first`).toBeGreaterThanOrEqual(m.cards[0]!.b - 1)

  // Fields: compact (<= 512px column) and fully inside their card and the viewport; labels readable (never clipped).
  expect(m.fields.length, `${label}: fields found`).toBeGreaterThan(0)
  for (const f of m.fields) {
    expect(f.w, `${label}: ${f.role} stays compact (max-w-lg)`).toBeLessThanOrEqual(513)
    expect(f.cardIndex, `${label}: ${f.role} belongs to a card`).toBeGreaterThanOrEqual(0)
    const c = m.cards[f.cardIndex]!
    expect(f.l, `${label}: ${f.role} inside card (left)`).toBeGreaterThanOrEqual(c.l - 1)
    expect(f.r, `${label}: ${f.role} inside card (right)`).toBeLessThanOrEqual(c.r + 1)
    expect(f.r, `${label}: ${f.role} inside viewport`).toBeLessThanOrEqual(vpW + 1)
  }
  expect(m.labels.length, `${label}: labels found`).toBeGreaterThan(0)
  for (const l of m.labels) {
    expect(l.clipped, `${label}: label "${l.text}" is not clipped`).toBe(false)
    expect(l.textOverflow, `${label}: label "${l.text}" has no ellipsis`).not.toBe('ellipsis')
    expect(l.text.length, `${label}: label has text`).toBeGreaterThan(0)
    expect(l.r, `${label}: label "${l.text}" inside viewport`).toBeLessThanOrEqual(vpW + 1)
    if (l.cardIndex >= 0) expect(l.r, `${label}: label "${l.text}" inside its card`).toBeLessThanOrEqual(m.cards[l.cardIndex]!.r + 1)
  }

  // Forms: no nesting; General = ONE form/ONE submit below both cards; Account = separate profile/password forms.
  expect(m.nestedForms, `${label}: no nested forms`).toBe(0)
  if (kind === 'general') {
    expect(m.forms, `${label}: exactly one form`).toBe(1)
    expect(m.submits.length, `${label}: exactly one submit`).toBe(1)
    expect(m.submits[0]!.formIndex, `${label}: submit belongs to the form`).toBe(0)
    expect(m.submits[0]!.t, `${label}: submit sits after BOTH cards`).toBeGreaterThanOrEqual(m.cards[1]!.b - 1)
    expect(m.fields.map(f => f.formIndex), `${label}: all four fields belong to the one form`).toEqual([0, 0, 0, 0])
    expect(m.fields.map(f => f.cardIndex), `${label}: one text + one select in card 1, two switches in card 2`).toEqual([0, 0, 1, 1])
  } else if (kind === 'account-local') {
    expect(m.forms, `${label}: separate profile and password forms`).toBe(2)
    expect(m.submits.map(s => s.formIndex).sort(), `${label}: one submit per form`).toEqual([0, 1])
    expect(m.passwords.length, `${label}: three password fields`).toBe(3)
  } else {
    expect(m.forms, `${label}: only the profile form (managed banner has no form)`).toBe(1)
    expect(m.submits.length, `${label}: only the profile submit`).toBe(1)
    expect(m.passwords.length, `${label}: no password fields for OIDC users`).toBe(0)
  }
}

function expectPasswordsStacked(m: Measured, label: string) {
  expect(m.passwords.length).toBe(3)
  for (const p of m.passwords) {
    expect(p.w, `${label}: password field readable`).toBeGreaterThanOrEqual(180)
    expect(p.r, `${label}: password field inside viewport`).toBeLessThanOrEqual(VP.mobile320.width + 1)
  }
  for (let i = 1; i < m.passwords.length; i++) expect(m.passwords[i]!.t, `${label}: password fields are stacked`).toBeGreaterThanOrEqual(m.passwords[i - 1]!.b - 1)
}

const COMBOS: [Lang, VpName][] = [['en', 'desktop'], ['en', 'mobile320'], ['de', 'desktop'], ['de', 'mobile320']]

// ---------------------------------------------------------------------------------------------
// Guard matcher contract (pure, no browser)
// ---------------------------------------------------------------------------------------------
test.describe('Console guard allowance matcher', () => {
  test('only the exact status + pathname resource failure is allowed; everything else stays fatal', () => {
    const res = (s: number, path: string | null, text = `Failed to load resource: the server responded with a status of ${s} (Error)`): GuardEvent => ({ kind: 'console-error', text, pathname: path })
    const allow: HttpAllowance[] = [{ status: 500, pathname: '/api/settings' }]
    expect(isAllowedEvent(res(500, '/api/settings'), allow), 'exact status + path').toBe(true)
    expect(isAllowedEvent(res(500, '/api/sites'), allow), 'other path').toBe(false)
    expect(isAllowedEvent(res(500, '/api/settings/x'), allow), 'prefix path').toBe(false)
    expect(isAllowedEvent(res(400, '/api/settings'), allow), 'other status').toBe(false)
    expect(isAllowedEvent(res(500, null), allow), 'no location').toBe(false)
    expect(isAllowedEvent(res(500, '/api/settings', 'Uncaught: Failed to load resource: the server responded with a status of 500'), allow), 'unanchored text').toBe(false)
    expect(isAllowedEvent(res(500, '/api/settings', 'Failed to load resource: net::ERR_NETWORK_CHANGED'), allow), 'network error').toBe(false)
    expect(isAllowedEvent(res(500, '/api/settings', 'Failed to fetch dynamically imported module: /_nuxt/a.js'), allow), 'dynamic import').toBe(false)
    expect(isAllowedEvent({ kind: 'pageerror', text: 'Failed to load resource: the server responded with a status of 500', pathname: '/api/settings' }, allow), 'pageerror').toBe(false)
    expect(isAllowedEvent({ kind: 'hydration', text: 'Failed to load resource: the server responded with a status of 500 hydrat', pathname: '/api/settings' }, allow), 'hydration').toBe(false)
    expect(isAllowedEvent(res(500, '/api/settings'), []), 'no allowance').toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// General tab: structure
// ---------------------------------------------------------------------------------------------
test.describe('Settings General: two cards, one form', () => {
  for (const [lang, vp] of COMBOS) {
    test(`General has one caps heading and two full-width cards with one form/one submit (${lang}, ${vp})`, async ({ page }) => {
      await mockSettings(page, MOCK_GENERAL)
      await openSettings(page, lang, vp, 'common.general')
      await expect(page.getByRole('textbox', { name: tr(lang, 'settings.general.appName'), exact: true })).toHaveValue(MOCK_GENERAL.app_name)
      const m = await measure(page)
      expectCards(m, lang, 'general', vp, `general ${lang} ${vp}`)
      expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
      // Accessibility: heading roles/levels and labelled controls (UFormField <-> USwitch/USelect association).
      await expect(page.getByRole('heading', { level: 2, name: tr(lang, 'common.general'), exact: true })).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 3, name: tr(lang, 'settings.general.basicTitle'), exact: true })).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 3, name: tr(lang, 'settings.general.featuresTitle'), exact: true })).toHaveCount(1)
      await expect(page.getByRole('combobox', { name: tr(lang, 'settings.general.defaultPortStatus') })).toBeVisible()
      await expect(page.getByRole('switch', { name: tr(lang, 'settings.general.patchPanelsEnabled') })).toBeVisible()
      await expect(page.getByRole('switch', { name: tr(lang, 'settings.general.switchGroupsEnabled') })).toBeVisible()
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true })
        await page.screenshot({ path: join(SHOTS, `settings-cards-general-${lang}-${vp}.png`) })
      }
    })
  }
})

// ---------------------------------------------------------------------------------------------
// General tab: behaviour (mocked server state)
// ---------------------------------------------------------------------------------------------
test.describe('Settings General: single PUT, no autosave (mocked server)', () => {
  test('draft edits in both cards send nothing until the one submit, then PUT exactly the four keys once and reload shows the returned state', async ({ page }) => {
    const srv = await mockSettings(page, MOCK_GENERAL)
    const writes = trackWrites(page)
    await openSettings(page, 'en', 'desktop', 'common.general')
    const name = page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })
    const status = page.getByRole('combobox', { name: tr('en', 'settings.general.defaultPortStatus') })
    const patch = page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') })
    const groups = page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })
    await expect(name).toHaveValue('Mock Switch Hub')
    await expect(patch).not.toBeChecked()
    await expect(groups).toBeChecked()

    await name.fill('Cards Renamed')
    await status.click()
    await page.getByRole('option', { name: 'Disabled', exact: true }).click()
    await patch.click()
    await groups.click()
    // Draft DOM reflects the toggles/inputs of BOTH cards.
    await expect(name).toHaveValue('Cards Renamed')
    await expect(status).toContainText('Disabled')
    await expect(patch).toBeChecked()
    await expect(groups).not.toBeChecked()
    await page.waitForTimeout(700)
    expect(srv.puts, 'no autosave: nothing sent before the submit').toEqual([])
    expect(writes, 'no write request before the submit').toEqual([])

    await page.getByRole('button', { name: tr('en', 'common.save'), exact: true }).click()
    await expect.poll(() => srv.puts.length, { message: 'exactly one PUT' }).toBe(1)
    await page.waitForTimeout(500)
    expect(srv.puts).toHaveLength(1)
    expect(Object.keys(srv.puts[0]!).sort(), 'payload carries exactly the four General keys').toEqual([...GENERAL_KEYS].sort())
    expect(srv.puts[0]).toEqual({ app_name: 'Cards Renamed', default_port_status: 'disabled', patch_panels_enabled: true, switch_groups_enabled: false })
    expect(writes, 'the only write is PUT /api/settings (no OIDC/profile/password/other calls)').toEqual(['PUT /api/settings'])
    await expect(page.getByText(tr('en', 'settings.messages.updated')).first()).toBeVisible()

    // Reload uses the state returned by the server, not stale client drafts.
    await page.reload()
    await page.getByRole('tab', { name: tr('en', 'common.general'), exact: true }).click()
    await expect(page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })).toHaveValue('Cards Renamed')
    await expect(page.getByRole('combobox', { name: tr('en', 'settings.general.defaultPortStatus') })).toContainText('Disabled')
    await expect(page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') })).toBeChecked()
    await expect(page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })).not.toBeChecked()
    expect(srv.puts, 'reload does not write').toHaveLength(1)
  })

  test('a change in one card still submits all four values through the same handler (Enter in the name field too)', async ({ page }) => {
    const srv = await mockSettings(page, MOCK_GENERAL)
    await openSettings(page, 'en', 'desktop', 'common.general')
    const name = page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })
    await expect(name).toHaveValue('Mock Switch Hub')
    await page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') }).click()
    await page.getByRole('button', { name: tr('en', 'common.save'), exact: true }).click()
    await expect.poll(() => srv.puts.length).toBe(1)
    expect(srv.puts[0], 'features-only change still sends the basic values unchanged').toEqual({ app_name: 'Mock Switch Hub', default_port_status: 'down', patch_panels_enabled: true, switch_groups_enabled: true })
    await name.fill('Enter Submitted')
    await name.press('Enter')
    await expect.poll(() => srv.puts.length).toBe(2)
    expect(srv.puts[1]).toEqual({ app_name: 'Enter Submitted', default_port_status: 'down', patch_panels_enabled: true, switch_groups_enabled: true })
  })

  test('a failed save shows the error toast and keeps the drafts of both cards', async ({ page }) => {
    allowHttpError(500, '/api/settings')
    const srv = await mockSettings(page, MOCK_GENERAL, { failPut: () => true })
    await openSettings(page, 'en', 'desktop', 'common.general')
    const name = page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })
    await expect(name).toHaveValue('Mock Switch Hub')
    await name.fill('Unsaved Draft')
    await page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') }).click()
    await page.getByRole('button', { name: tr('en', 'common.save'), exact: true }).click()
    await expect(page.getByText(tr('en', 'errors.serverError')).first()).toBeVisible()
    expect(srv.puts).toHaveLength(1)
    await expect(name).toHaveValue('Unsaved Draft')
    await expect(page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })).not.toBeChecked()
  })
})

// ---------------------------------------------------------------------------------------------
// Account tab (local admin cookie; all writes mocked)
// ---------------------------------------------------------------------------------------------
test.describe('Settings Account (local user): profile card + password card', () => {
  for (const [lang, vp] of COMBOS) {
    test(`Account has one caps heading, a profile card and a password card in separate forms (${lang}, ${vp})`, async ({ page }) => {
      await mockSettings(page, MOCK_GENERAL)
      await openSettings(page, lang, vp, 'common.account')
      await expect(page.getByRole('heading', { level: 2, name: tr(lang, 'common.account'), exact: true })).toHaveCount(1)
      const m = await measure(page)
      expectCards(m, lang, 'account-local', vp, `account-local ${lang} ${vp}`)
      if (vp === 'mobile320') expectPasswordsStacked(m, `account-local ${lang}`)
      expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
      await expect(page.getByLabel(tr(lang, 'settings.account.currentPassword'), { exact: true })).toBeVisible()
      await expect(page.getByLabel(tr(lang, 'settings.account.newPassword'), { exact: true })).toBeVisible()
      await expect(page.getByLabel(tr(lang, 'settings.account.confirmNewPassword'), { exact: true })).toBeVisible()
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true })
        await page.screenshot({ path: join(SHOTS, `settings-cards-account-${lang}-${vp}.png`) })
      }
    })
  }

  test('the profile form saves only display name + language through its own handler (no password call)', async ({ page }) => {
    await mockSettings(page, MOCK_GENERAL)
    const users = await mockUserWrites(page)
    await openSettings(page, 'en', 'desktop', 'common.account')
    const display = page.getByRole('textbox', { name: tr('en', 'settings.account.displayName'), exact: true })
    await expect(display).not.toHaveValue('')
    await display.fill('Mock Display Name')
    await page.getByRole('button', { name: tr('en', 'settings.account.saveProfile'), exact: true }).click()
    await expect.poll(() => users.calls.length).toBe(1)
    await page.waitForTimeout(400)
    expect(users.calls).toHaveLength(1)
    expect(users.calls[0]!.path).toMatch(/^\/api\/users\/[^/]+$/)
    expect(Object.keys(users.calls[0]!.body).sort()).toEqual(['display_name', 'language'])
    expect(users.calls[0]!.body.display_name).toBe('Mock Display Name')
    await expect(page.getByText(tr('en', 'settings.messages.profileUpdated')).first()).toBeVisible()
  })

  test('the password form keeps its validation messages and never calls the API while invalid', async ({ page }) => {
    await mockSettings(page, MOCK_GENERAL)
    const users = await mockUserWrites(page)
    await openSettings(page, 'en', 'desktop', 'common.account')
    const cur = page.getByLabel(tr('en', 'settings.account.currentPassword'), { exact: true })
    const next = page.getByLabel(tr('en', 'settings.account.newPassword'), { exact: true })
    const conf = page.getByLabel(tr('en', 'settings.account.confirmNewPassword'), { exact: true })
    const submit = page.getByRole('button', { name: tr('en', 'settings.account.savePassword'), exact: true })
    await submit.click()
    await expect(page.getByText(tr('en', 'settings.account.validation.currentPasswordRequired')).first()).toBeVisible()
    await expect(page.getByText(tr('en', 'settings.account.validation.newPasswordMin')).first()).toBeVisible()
    await cur.fill('mock-current-pw')
    await next.fill('short')
    await conf.fill('different')
    await submit.click()
    await expect(page.getByText(tr('en', 'settings.account.validation.newPasswordMin')).first()).toBeVisible()
    await expect(page.getByText(tr('en', 'settings.account.validation.passwordMismatch')).first()).toBeVisible()
    await page.waitForTimeout(400)
    expect(users.calls, 'invalid password forms send nothing').toEqual([])
  })

  test('a valid password change PUTs exactly current/new once and clears the fields; a server error shows its message', async ({ page, request }) => {
    // Only the mocked 400 on the CURRENT user's own password endpoint is an allowed console resource error.
    const me = await (await request.get('/api/auth/me')).json() as { id: string }
    const passwordPath = `/api/users/${me.id}/password`
    allowHttpError(400, passwordPath)
    await mockSettings(page, MOCK_GENERAL)
    const users = await mockUserWrites(page)
    await openSettings(page, 'en', 'desktop', 'common.account')
    const cur = page.getByLabel(tr('en', 'settings.account.currentPassword'), { exact: true })
    const next = page.getByLabel(tr('en', 'settings.account.newPassword'), { exact: true })
    const conf = page.getByLabel(tr('en', 'settings.account.confirmNewPassword'), { exact: true })
    const submit = page.getByRole('button', { name: tr('en', 'settings.account.savePassword'), exact: true })

    users.setPasswordStatus(400)
    await cur.fill('mock-current-pw')
    await next.fill('mock-new-pass-1')
    await conf.fill('mock-new-pass-1')
    await submit.click()
    await expect(page.getByText('Mocked wrong password').first()).toBeVisible()
    expect(users.calls).toHaveLength(1)
    expect(users.calls[0]!.path, 'the 400 is on the current user password endpoint, not the profile endpoint').toBe(passwordPath)
    await expect(cur, 'fields are kept after an error').toHaveValue('mock-current-pw')

    users.setPasswordStatus(200)
    await submit.click()
    await expect.poll(() => users.calls.length).toBe(2)
    expect(users.calls[1]!.path).toBe(passwordPath)
    expect(Object.keys(users.calls[1]!.body).sort()).toEqual(['current_password', 'new_password'])
    await expect(page.getByText(tr('en', 'settings.messages.passwordChanged')).first()).toBeVisible()
    await expect(cur).toHaveValue('')
    await expect(next).toHaveValue('')
    await expect(conf).toHaveValue('')
    expect(users.calls.every(c => c.path.endsWith('/password')), 'no profile call from the password form').toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// Personas (UI only): OIDC admin sees the managed banner and no password form; local viewer sees only Account
// ---------------------------------------------------------------------------------------------
test.describe('Settings personas (mocked login, UI-only)', () => {
  for (const [lang, vp] of [['en', 'desktop'], ['de', 'mobile320']] as [Lang, VpName][]) {
    test(`OIDC admin: Account shows the managed banner and no password form; General + Authentication tabs remain (${lang}, ${vp})`, async ({ browser, request, baseURL }) => {
      const h = await openPersona(browser, request, baseURL, { role: 'admin', auth_provider: 'oidc', language: lang }, vp)
      try {
        const { page } = h
        await expect(page.getByRole('tab', { name: tr(lang, 'common.general'), exact: true })).toBeVisible()
        await expect(page.getByRole('tab', { name: tr(lang, 'settings.oidc.tab'), exact: true })).toBeVisible()
        await page.getByRole('tab', { name: tr(lang, 'common.account'), exact: true }).click()
        await expect(page.getByRole('tabpanel')).toHaveCount(1)
        await expect(page.getByText(tr(lang, 'settings.account.oidcManagedDescription'))).toBeVisible()
        await expect(page.getByLabel(tr(lang, 'settings.account.currentPassword'), { exact: true })).toHaveCount(0)
        await expect(page.getByRole('heading', { name: tr(lang, 'settings.account.changePassword'), exact: true })).toHaveCount(0)
        const m = await measure(page)
        expectCards(m, lang, 'account-oidc', vp, `account-oidc ${lang} ${vp}`)
        expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true })
          await page.screenshot({ path: join(SHOTS, `settings-cards-account-oidc-${lang}-${vp}.png`) })
        }
      } finally {
        await closePersona(h)
      }
    })
  }

  test('local viewer: only the Account tab (no General, no Authentication) with profile + password cards', async ({ browser, request, baseURL }) => {
    const h = await openPersona(browser, request, baseURL, { role: 'viewer', auth_provider: 'local', language: 'en' }, 'mobile320')
    try {
      const { page } = h
      await expect(page.getByRole('tab')).toHaveCount(1)
      await expect(page.getByRole('tab', { name: tr('en', 'common.account'), exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: tr('en', 'common.general'), exact: true })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: tr('en', 'settings.general.basicTitle'), exact: true })).toHaveCount(0)
      const m = await measure(page)
      expectCards(m, 'en', 'account-local', 'mobile320', 'viewer account-local en mobile320')
      expectPasswordsStacked(m, 'viewer account')
      expect(await noPageOverflow(page), 'no horizontal overflow').toBe(true)
    } finally {
      await closePersona(h)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// REAL candidate: General save/reload with restore of ALL four original values (isolated 3105 only)
// ---------------------------------------------------------------------------------------------
test.describe('Settings General against the real candidate (save, reload, restore)', () => {
  test.skip(!REAL, 'OIDC_E2E_REAL_BRANDING not set (isolated candidate with synthetic data only)')

  test('saving the two General cards persists all four values through the real API and the originals are restored', async ({ page, request, baseURL }) => {
    // Never mutate anything but the isolated candidate (checked BEFORE the first write).
    expect(baseURL, 'REAL test only runs against the isolated candidate origin').toBe(CANDIDATE)
    const readFour = async (): Promise<GeneralValues> => {
      const res = await request.get('/api/settings')
      expect(res.ok(), 'settings readable').toBe(true)
      const s = await res.json() as Record<string, unknown>
      return Object.fromEntries(GENERAL_KEYS.map(k => [k, s[k]])) as GeneralValues
    }
    const original = await readFour()
    const next: GeneralValues = {
      app_name: `Cards E2E ${Date.now().toString(36)}`,
      default_port_status: original.default_port_status === 'disabled' ? 'up' : 'disabled',
      patch_panels_enabled: !original.patch_panels_enabled,
      switch_groups_enabled: !original.switch_groups_enabled
    }
    try {
      await page.setViewportSize(VP.desktop)
      await mockOidc(page)
      await page.goto('/settings')
      await page.getByRole('tab', { name: tr('en', 'common.general'), exact: true }).click()
      const name = page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })
      const status = page.getByRole('combobox', { name: tr('en', 'settings.general.defaultPortStatus') })
      const patch = page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') })
      const groups = page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })
      await expect(name).toHaveValue(original.app_name)
      await name.fill(next.app_name)
      await status.click()
      await page.getByRole('option', { name: next.default_port_status === 'up' ? 'Up' : 'Disabled', exact: true }).click()
      await patch.click()
      await groups.click()
      const saved = page.waitForResponse(r => new URL(r.url()).pathname === '/api/settings' && r.request().method() === 'PUT')
      await page.getByRole('button', { name: tr('en', 'common.save'), exact: true }).click()
      const res = await saved
      expect(res.ok(), 'PUT /api/settings succeeded').toBe(true)
      expect(Object.keys(res.request().postDataJSON() as object).sort()).toEqual([...GENERAL_KEYS].sort())
      expect(await readFour(), 'API returns the saved values').toEqual(next)
      await page.reload()
      await page.getByRole('tab', { name: tr('en', 'common.general'), exact: true }).click()
      await expect(page.getByRole('textbox', { name: tr('en', 'settings.general.appName'), exact: true })).toHaveValue(next.app_name)
      await expect(page.getByRole('combobox', { name: tr('en', 'settings.general.defaultPortStatus') })).toContainText(next.default_port_status === 'up' ? 'Up' : 'Disabled')
      if (next.patch_panels_enabled) await expect(page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') })).toBeChecked()
      else await expect(page.getByRole('switch', { name: tr('en', 'settings.general.patchPanelsEnabled') })).not.toBeChecked()
      if (next.switch_groups_enabled) await expect(page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })).toBeChecked()
      else await expect(page.getByRole('switch', { name: tr('en', 'settings.general.switchGroupsEnabled') })).not.toBeChecked()
    } finally {
      const restore = await request.put('/api/settings', { data: original })
      expect(restore.ok(), 'original General settings restored').toBe(true)
      expect(await readFour(), 'all four original values restored exactly').toEqual(original)
    }
  })
})
