import { test as base, expect, type Page, type Route } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Admin Users overview (/users). Contract: admin-only page + nav entry, six columns (username, display name,
 * role, sign-in method, created, actions), no identity/secret fields rendered. Account MANAGEMENT flows
 * (create/edit/delete) live in users-management.spec.ts; here the overview must stay idle (no spontaneous non-GET).
 *
 * Cases that mock `GET /api/users` prove CLIENT UI behaviour only. Cases gated by
 * OIDC_E2E_REAL_BRANDING=1 talk to the real isolated candidate with SYNTHETIC users they create and
 * remove. Nothing here proves a real external SSO login (OIDC rows are mocked data).
 * Screenshots are written only when OIDC_E2E_SHOTS_DIR is set.
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)
function watch(page: Page, sink: string[]) {
  page.on('console', (m) => { if (m.type() === 'error') sink.push(`console: ${redact(m.text())}`) })
  page.on('pageerror', e => sink.push(`pageerror: ${redact(e.message)}`))
}

/** Every test fails on unexpected console/page errors; deliberate failing requests are annotated per test. */
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

const REAL = !!process.env.OIDC_E2E_REAL_BRANDING
const SHOTS = process.env.OIDC_E2E_SHOTS_DIR

// Identity/secret-looking values that must NEVER appear in the rendered page.
const SECRET_ISSUER = 'https://idp.hidden.example'
const SECRET_SUBJECT = 'sub-HIDDEN-0123456789'
const SECRET_ID = '8d0c7a0e-1b2c-4d3e-9f40-aabbccddeeff'
const HTML_NAME = '<img src=x onerror="window.__xss=1"><b>Mallory</b>'

const ts = '2026-01-01T00:00:00.000Z'
const row = (over: Record<string, unknown>) => ({
  id: crypto.randomUUID(), username: 'u', display_name: 'U', role: 'viewer', language: 'en', is_setup_user: false,
  created_at: ts, updated_at: ts, auth_provider: 'local', oidc_issuer: null, oidc_subject: null, oidc_session_version: 0, ...over
})
const USERS = [
  row({ username: 'alice.local', display_name: 'Alice Local', role: 'admin', is_setup_user: true }),
  row({ id: SECRET_ID, username: 'olivia_oidc', display_name: 'Olivia OIDC', role: 'admin', auth_provider: 'oidc', oidc_issuer: SECRET_ISSUER, oidc_subject: SECRET_SUBJECT, oidc_session_version: 7 }),
  row({ username: 'victor_viewer', display_name: 'Victor Viewer', role: 'viewer', auth_provider: 'oidc', oidc_issuer: SECRET_ISSUER, oidc_subject: `${SECRET_SUBJECT}-2` }),
  row({ username: 'bob.local', display_name: HTML_NAME, role: 'viewer' })
]

const T = {
  en: { users: 'Users', headers: ['Username', 'Display name', 'Role', 'Sign-in method', 'Created', 'Actions'], settings: 'Settings', local: /^Local account$/, oidc: /^OpenID Connect$/, retry: /^Try again$/, loading: /Loading accounts/, error: /Users could not be loaded/, empty: /No accounts yet/, caption: 'Provisioned ezSWM user accounts' },
  de: { users: 'Benutzer', headers: ['Benutzername', 'Anzeigename', 'Rolle', 'Anmeldemethode', 'Erstellt am', 'Aktionen'], settings: 'Einstellungen', local: /^Lokales Konto$/, oidc: /^OpenID Connect$/, retry: /^Erneut versuchen$/, loading: /Konten werden geladen/, error: /Benutzer konnten nicht geladen werden/, empty: /Noch keine Konten/, caption: 'In ezSWM angelegte Benutzerkonten' }
} as const
type Lang = keyof typeof T

const noPageOverflow = (page: Page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  && document.body.scrollWidth <= document.body.clientWidth + 1)

async function switchLang(page: Page, lang: Lang) {
  // Public readiness boundary (a proxy only): the theme button is rendered client-side, so waiting for it avoids clicking before that
  // part of the header is mounted. This does not prove global Nuxt/Vue listener ordering or fix any hydration behaviour.
  await expect(page.getByRole('button', { name: /^Switch to (light|dark) mode$/ })).toBeVisible()
  await page.getByRole('button', { name: /^(Language|Sprache)$/ }).click()
  await page.getByRole('menuitem', { name: lang === 'de' ? 'Deutsch' : 'English' }).click()
  await expect(page.locator('h1').first()).toBeVisible()
  // Make sure the language menu is closed again so it never lingers in screenshots.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem')).toHaveCount(0)
}
async function restoreEnglish(page: Page, request: import('@playwright/test').APIRequestContext, was: Lang) {
  if (was === 'de') await switchLang(page, 'en')
  // The header menu persists the profile language asynchronously: poll instead of reading once.
  await expect.poll(async () => ((await (await request.get('/api/auth/me')).json()) as { language: string }).language, { message: 'disposable admin language restored' }).toBe('en')
}

/** Record every non-GET request and every /api/users request made by the page. */
function trackRequests(page: Page) {
  const mutating: string[] = []
  const usersReads: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (!u.pathname.startsWith('/api/')) return
    if (r.method() !== 'GET') mutating.push(`${r.method()} ${u.pathname}`)
    if (u.pathname.startsWith('/api/users')) usersReads.push(`${r.method()} ${u.pathname}`)
  })
  return { mutating, usersReads }
}

/** The ONE semantic table is used at every breakpoint: one body row for `username`. */
const rowOf = (page: Page, username: string) => page.locator('tbody tr').filter({ hasText: username }).first()
/** A visible text cell (username row header, display name, role/provider badge text). */
const cell = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true }).first()
/** Labelled, keyboard-focusable horizontal scroller around the table. */
const scroller = (page: Page) => page.locator('main [role="region"][tabindex="0"]')

test.describe('Users overview (admin, mocked GET /api/users)', () => {
  async function open(page: Page, users: unknown = USERS, lang: Lang = 'en') {
    await page.route('**/api/users', route => route.request().method() === 'GET' ? json(route, users) : json(route, { error: 'unexpected' }, 405))
    await page.goto('/users')
    if (lang === 'de') await switchLang(page, 'de')
    await expect(page.locator('h1').first()).toHaveText(T[lang].users)
  }

  test('lists local and OIDC users in six columns (username, display name, role, sign-in method, created, actions)', async ({ page }) => {
    await open(page)
    for (const u of USERS) await expect(cell(page, u.username)).toBeVisible()
    // ONE table, six labelled columns, in this order.
    await expect(page.getByRole('table')).toHaveCount(1)
    const headers = page.getByRole('columnheader')
    await expect(headers).toHaveCount(6)
    await expect(headers).toHaveText(T.en.headers)
    // Each row: row header = username, then exactly five cells = display name, role, sign-in method, created, actions.
    for (const [username, display, role, method] of [
      ['alice.local', 'Alice Local', 'Admin', T.en.local],
      ['olivia_oidc', 'Olivia OIDC', 'Admin', T.en.oidc],
      ['victor_viewer', 'Victor Viewer', 'Viewer', T.en.oidc]
    ] as const) {
      const r = rowOf(page, username)
      await expect(r.getByRole('rowheader')).toHaveText(username)
      const cells = r.getByRole('cell')
      await expect(cells).toHaveCount(5)
      await expect(cells.nth(0)).toHaveText(display)
      await expect(cells.nth(1)).toHaveText(role)
      await expect(cells.nth(2)).toHaveText(method)
      await expect(cells.nth(3)).not.toBeEmpty()
    }
    // the literal-HTML display name row is still rendered as one body row
    await expect(page.locator('tbody tr')).toHaveCount(USERS.length)
  })

  test('never renders identity, session, id, hash or secret values', async ({ page }) => {
    await open(page)
    const body = page.locator('body')
    for (const hidden of [SECRET_ISSUER, SECRET_SUBJECT, SECRET_ID, 'idp.hidden', 'password', 'hash', 'session']) {
      await expect(body, `page must not show "${hidden}"`).not.toContainText(hidden, { ignoreCase: true })
    }
    expect(await page.content()).not.toContain(SECRET_SUBJECT)
  })

  test('literal HTML in a display name is plain text (no DOM, no script)', async ({ page }) => {
    await open(page)
    await expect(page.locator('body')).toContainText(HTML_NAME)
    await expect(page.locator('main img, main b')).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  })

  test('idle overview: management buttons exist (local rows editable, OIDC rows provider-managed), no form open, no non-GET request', async ({ page }) => {
    const req = trackRequests(page)
    await open(page)
    await expect(cell(page, 'alice.local')).toBeVisible()
    const main = page.locator('main')
    await expect(main.getByRole('button', { name: 'Create account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit account for alice.local' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete account alice.local' })).toBeVisible()
    // OIDC rows: no edit, provider label instead, delete still offered.
    const oidc = rowOf(page, 'olivia_oidc')
    await expect(oidc.getByRole('button', { name: /^Edit account/ })).toHaveCount(0)
    await expect(oidc.getByText('Provider-managed role')).toBeVisible()
    await expect(oidc.getByRole('button', { name: 'Delete account olivia_oidc' })).toBeVisible()
    // No dialog/form is open and nothing links to per-user pages.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(main.locator('input, textarea, select, form')).toHaveCount(0)
    await expect(main.locator('a[href^="/users/"]')).toHaveCount(0)
    expect(req.mutating).toEqual([])
    expect(req.usersReads.every(r => r === 'GET /api/users')).toBe(true)
  })

  test('shows a loading placeholder first (not the empty state), then the rows', async ({ page }) => {
    await page.route('**/api/users', async (route) => {
      await new Promise(r => setTimeout(r, 1500))
      await json(route, USERS)
    })
    await page.goto('/users')
    await expect(page.locator('h1').first()).toHaveText(T.en.users)
    await expect(page.getByText(T.en.empty)).toHaveCount(0)
    // The loading state is a status region with an sr-only label (spinner is aria-hidden).
    await expect(page.getByRole('status').filter({ hasText: T.en.loading })).toHaveCount(1)
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(cell(page, 'alice.local')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: T.en.loading })).toHaveCount(0)
  })

  test('empty list shows an explicit empty state', async ({ page }) => {
    await open(page, [])
    await expect(page.getByText(T.en.empty)).toBeVisible()
    await expect(page.getByText(T.en.loading)).toHaveCount(0)
  })

  test('a failing GET shows an error (not "empty"), Retry refetches and then lists the rows', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-console', description: 'Failed to load resource|500' })
    let calls = 0
    await page.route('**/api/users', (route) => {
      calls++
      // $fetch retries a failing GET once by default, so the first TWO requests fail and the user's Retry is the third.
      return calls <= 2 ? json(route, { statusMessage: 'x' }, 500) : json(route, USERS)
    })
    await page.goto('/users')
    await expect(page.getByText(T.en.error)).toBeVisible()
    await expect(page.getByText(T.en.empty)).toHaveCount(0)
    await page.getByRole('button', { name: T.en.retry }).click()
    await expect(cell(page, 'alice.local')).toBeVisible()
    expect(calls).toBe(3)
  })

  for (const lang of ['en', 'de'] as const) {
    test(`navigation entry + breadcrumb for admins (${lang.toUpperCase()}, desktop)`, async ({ page, request }) => {
      try {
        await page.setViewportSize({ width: 1440, height: 900 })
        await open(page, USERS, lang)
        const link = page.getByRole('link', { name: T[lang].users, exact: true }).first()
        await expect(link).toBeVisible()
        await expect(link).toHaveAttribute('href', '/users')
        // breadcrumb = the navigation that shows the page name but is not the sidebar link list
        await expect(page.locator('nav:not(:has(a[href="/users"]))').getByText(T[lang].users, { exact: true })).toBeVisible()
      } finally {
        await restoreEnglish(page, request, lang)
      }
    })
  }

  test('navigation entry is reachable on mobile (390px) via the menu and navigates to /users', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route('**/api/users', route => json(route, USERS))
    await page.goto('/')
    await page.locator('[data-testid="mobile-menu-button"]').click()
    const link = page.locator('a[href="/users"]').filter({ visible: true }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/users$/)
    await expect(page.locator('h1').first()).toHaveText(T.en.users)
    await expect(cell(page, 'alice.local')).toBeVisible()
  })

  for (const lang of ['en', 'de'] as const) {
    test(`320px ${lang.toUpperCase()}: long username/display name stay plain text, no PAGE horizontal overflow, long values wrap, table scrolls in its own region`, async ({ page, request }) => {
      const long = row({ username: `very.long.username.${'x'.repeat(70)}`, display_name: `Dr. ${'Überlanger-Anzeigename-'.repeat(5)}`, role: 'viewer', auth_provider: 'oidc' })
      try {
        await page.setViewportSize({ width: 320, height: 640 })
        await open(page, [...USERS, long], lang)
        await expect(cell(page, long.username)).toBeVisible()
        expect(await noPageOverflow(page), 'document scrolls horizontally').toBe(true)
        expect(await page.locator('main').evaluate(m => m.scrollWidth > m.clientWidth + 1), 'main scrolls horizontally').toBe(false)
        // A table may scroll INSIDE its own container; nothing else may.
        const stray = await cell(page, long.username).evaluate((el) => {
          const out: string[] = []
          for (let n: Element | null = el.parentElement; n && n.tagName !== 'MAIN'; n = n.parentElement) {
            const ox = getComputedStyle(n).overflowX
            if (n.scrollWidth > n.clientWidth + 1 && !['auto', 'scroll'].includes(ox)) out.push(`${n.tagName.toLowerCase()} ${n.scrollWidth}>${n.clientWidth}`)
          }
          return out
        })
        expect(stray, 'ancestors overflow without an intentional scroll container').toEqual([])
        // ONE table at 320: it scrolls inside its own labelled, keyboard-focusable region (not the document).
        const region = scroller(page)
        await expect(region).toHaveCount(1)
        await expect(region).toHaveAttribute('aria-label', T[lang].caption)
        expect(await region.evaluate(el => el.scrollWidth > el.clientWidth + 1), 'table scroller scrolls horizontally at 320').toBe(true)
        await region.focus()
        await expect(region).toBeFocused()
        // Long plain-text values wrap inside their own cells instead of widening them.
        const longRow = rowOf(page, long.username)
        for (const c of [longRow.getByRole('rowheader'), longRow.getByRole('cell').first()]) {
          expect(await c.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'long value wraps inside its cell').toBe(true)
        }
        // Geometry: at 320 the card scroller is ~270px wide while the single table keeps its 56rem (896px) minimum with six
        // columns, so the role and sign-in method cells can never both sit inside it at once.
        // Contract: every value is reachable through the local scroll region, ONE AT A TIME. Scroll each actual label
        // (the read-only badge text) into view and require that label to sit fully inside the scroller viewport.
        await region.evaluate((el) => { el.scrollLeft = 0 })
        expect(await region.evaluate(el => el.scrollLeft), 'scroller starts at its left edge').toBe(0)
        for (const [name, index, expected] of [['role', 1, /Viewer/], ['sign-in method', 2, T[lang].oidc]] as const) {
          const cellEl = longRow.getByRole('cell').nth(index)
          const label = cellEl.locator('span').first()
          await expect(label, `${name}: actual label inside its cell`).toHaveText(expected)
          const before = await region.evaluate(el => el.scrollLeft)
          await label.scrollIntoViewIfNeeded()
          const [rb, lb] = await Promise.all([region.boundingBox(), label.boundingBox()])
          expect(await region.evaluate(el => el.scrollLeft), `${name}: the local scroller moved to reveal it`).toBeGreaterThan(before)
          expect(lb!.x, `${name}: label starts inside the scroller viewport`).toBeGreaterThanOrEqual(rb!.x - 1)
          expect(lb!.x + lb!.width, `${name}: label ends inside the scroller viewport`).toBeLessThanOrEqual(rb!.x + rb!.width + 1)
          expect(lb!.y, `${name}: label is vertically inside the scroller`).toBeGreaterThanOrEqual(rb!.y - 1)
          expect(lb!.y + lb!.height, `${name}: label is vertically inside the scroller`).toBeLessThanOrEqual(rb!.y + rb!.height + 1)
          // a badge must also stay inside its own cell (no clipping/overflow of the read-only value)
          const cb = await cellEl.boundingBox()
          expect(lb!.x + lb!.width, `${name}: label stays inside its own cell`).toBeLessThanOrEqual(cb!.x + cb!.width + 1)
        }
        expect(await noPageOverflow(page), 'document still does not scroll horizontally after scrolling the table').toBe(true)
      } finally {
        await restoreEnglish(page, request, lang)
      }
    })
  }
})

/**
 * Visual consistency with the established inventory lists (Switches / Subnets). Relative, source-anchored checks:
 *  - the reference class strings are asserted to still exist in the Switches/Subnets page SOURCE (read-only),
 *  - the Users page elements are compared by COMPUTED style to probe elements carrying exactly those reference classes
 *    (probes are appended to <main> and removed again; nothing is persisted). No invented pixel values.
 */
const REF = {
  title: 'text-xl font-bold',
  card: 'list-container rounded-lg bg-default',
  header: 'px-5 py-1.5 text-[10px] uppercase tracking-wider text-gray-500',
  rowHover: 'row-hover',
  root: 'p-6'
}
test.describe('Users overview visual consistency with Switches/Subnets (reference classes)', () => {
  const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

  test('reference class strings still exist in the Switches and Subnets page source', async () => {
    const switches = src('app/pages/sites/[siteId]/switches/index.vue')
    const subnets = src('app/pages/sites/[siteId]/subnets/index.vue')
    for (const [name, text] of [['switches', switches], ['subnets', subnets]] as const) {
      expect(text, `${name}: page root`).toContain(`<div class="${REF.root}">`)
      expect(text, `${name}: h1`).toContain(`<h1 class="${REF.title}">`)
    }
    // The list card + hover pattern is defined by the Subnets list (Switches uses grouped panels).
    expect(subnets, 'subnets: list card').toContain(REF.card)
    expect(subnets, 'subnets: row hover').toContain(REF.rowHover)
    expect(subnets, 'subnets: compact uppercase header').toContain(`text-[10px] uppercase tracking-wider text-gray-500`)
    expect(subnets, 'subnets: header padding').toContain('px-5 py-1.5')
    const css = src('app/assets/css/main.css')
    expect(css).toContain('.list-container')
    expect(css).toContain('.row-hover')
  })

  for (const lang of ['en', 'de'] as const) {
    for (const [vpName, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } })) {
      test(`title, card, table header, hover and width match the inventory list pattern (${lang}, ${vpName})`, async ({ page, request }) => {
        try {
          await page.setViewportSize(vp)
          await page.route('**/api/users', route => json(route, USERS))
          await page.goto('/users')
          if (lang === 'de') await switchLang(page, 'de')
          await expect(page.locator('h1').first()).toHaveText(T[lang].users)
          await expect(cell(page, 'alice.local')).toBeVisible()

          const m = await page.evaluate((ref) => {
            const main = document.querySelector('main')!
            const mk = (tag: string, cls: string) => { const e = document.createElement(tag); e.className = cls; e.setAttribute('data-ref-probe', ''); main.appendChild(e); return e }
            const pick = (el: Element, props: string[]) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)])) }
            try {
              const h1 = document.querySelector('main h1')!
              const root = h1.closest('.p-6')
              const card = document.querySelector('main [role="region"][tabindex="0"]')!
              const th = document.querySelector('main thead th')!
              const probes = { title: mk('h1', ref.title), card: mk('div', ref.card), header: mk('div', ref.header), root: mk('div', ref.root) }
              const text = ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'color']
              const box = ['border-top-width', 'border-top-style', 'border-top-color', 'border-top-left-radius', 'background-color']
              // `color` is intentionally not compared: the Users header uses the semantic `text-muted` token, the reference list `text-gray-500`.
              const head = ['font-size', 'text-transform', 'letter-spacing', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom']
              const rootEl = root as HTMLElement | null
              const rb = rootEl?.getBoundingClientRect()
              const rcs = rootEl ? getComputedStyle(rootEl) : null
              const cb = card.getBoundingClientRect()
              const table = card.querySelector('table')!
              return {
                hasRoot: !!rootEl,
                title: [pick(h1, text), pick(probes.title, text)],
                card: [pick(card, box), pick(probes.card, box)],
                header: [pick(th, head), pick(probes.header, head)],
                rootPad: [rcs ? pick(rootEl!, ['padding-left', 'padding-top']) : null, pick(probes.root, ['padding-left', 'padding-top'])],
                span: rb && rcs ? { cardL: cb.x, cardR: cb.right, contentL: rb.x + parseFloat(rcs.paddingLeft), contentR: rb.right - parseFloat(rcs.paddingRight) } : null,
                table: { width: table.getBoundingClientRect().width, clientWidth: card.clientWidth, minWidth: 56 * parseFloat(getComputedStyle(document.documentElement).fontSize) }
              }
            } finally {
              document.querySelectorAll('[data-ref-probe]').forEach(e => e.remove())
            }
          }, REF)

          expect(m.title[0], 'h1 typography matches the inventory title').toEqual(m.title[1])
          expect(m.card[0], 'card border/radius/background match the inventory list card').toEqual(m.card[1])
          expect(m.header[0], 'column header typography/padding matches the inventory header row').toEqual(m.header[1])
          expect(m.hasRoot, 'page root uses the shared p-6 padding').toBe(true)
          expect(m.rootPad[0], 'page padding matches').toEqual(m.rootPad[1])
          // The card spans the whole page content box (no narrow island), within tolerance.
          expect(Math.abs(m.span!.cardL - m.span!.contentL), 'card starts at the content left edge').toBeLessThanOrEqual(2)
          expect(Math.abs(m.span!.cardR - m.span!.contentR), 'card ends at the content right edge').toBeLessThanOrEqual(2)
          // Table: fills the card; never narrower than its own min width (scrolls inside the card on 320).
          expect(m.table.width, 'table fills the card scroller').toBeGreaterThanOrEqual(m.table.clientWidth - 1)
          expect(m.table.width, 'table keeps its 56rem minimum').toBeGreaterThanOrEqual(m.table.minWidth - 1)
          expect(await page.locator('[data-ref-probe]').count(), 'probes removed').toBe(0)
          expect(await noPageOverflow(page), 'page scrolls horizontally').toBe(true)

          // Row hover feedback exists (shared row-hover pattern).
          const first = rowOf(page, 'alice.local')
          await expect(first).toHaveClass(/row-hover/)
          await first.hover()
          await expect.poll(() => first.evaluate(el => getComputedStyle(el).backgroundColor), 'hover background applied').not.toBe('rgba(0, 0, 0, 0)')
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })
    }
  }
})

test.describe('Users overview access control (real candidate)', () => {
  test.skip(!REAL, 'OIDC_E2E_REAL_BRANDING not set (isolated candidate with synthetic users only)')

  const viewerName = `e2e_users_viewer_${Date.now().toString(36)}`
  const viewerPassword = 'viewer-users-pass-123'
  let viewerId = ''

  test.beforeAll(async ({ request }) => {
    const created = await request.post('/api/users', { data: { username: viewerName, display_name: 'E2E Users Viewer', password: viewerPassword, role: 'viewer', language: 'en' } })
    expect(created.ok()).toBe(true)
    viewerId = ((await created.json()) as { id: string }).id
  })
  test.afterAll(async ({ request }) => {
    if (viewerId) await request.delete(`/api/users/${viewerId}`)
  })

  test('real GET /api/users: admin 200 without password_hash, viewer 403, anonymous 401', async ({ request, playwright, baseURL }) => {
    const ok = await request.get('/api/users')
    expect(ok.status()).toBe(200)
    const rows = await ok.json() as Array<Record<string, unknown>>
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect('password_hash' in r).toBe(false)
    expect(JSON.stringify(rows)).not.toMatch(/\$2[aby]\$/)

    const anon = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    expect((await anon.get('/api/users')).status()).toBe(401)
    await anon.dispose()

    const viewerApi = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    expect((await viewerApi.post('/api/auth/login', { data: { username: viewerName, password: viewerPassword } })).ok()).toBe(true)
    expect((await viewerApi.get('/api/users')).status()).toBe(403)
    await viewerApi.dispose()
  })

  test('admin sees the real page with the synthetic viewer and no password/hash text; page makes only GETs', async ({ page }) => {
    const req = trackRequests(page)
    await page.goto('/users')
    await expect(page.locator('h1').first()).toHaveText(T.en.users)
    await expect(cell(page, viewerName)).toBeVisible()
    await expect(rowOf(page, viewerName)).toContainText(/Viewer/)
    await expect(rowOf(page, viewerName).getByText(T.en.local)).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/\$2[aby]\$/)
    expect(req.mutating).toEqual([])
  })

  test('a viewer gets no nav entry and /users redirects BEFORE any /api/users request', async ({ browser, baseURL, playwright }) => {
    const api = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    expect((await api.post('/api/auth/login', { data: { username: viewerName, password: viewerPassword } })).ok()).toBe(true)
    const ctx = await browser.newContext({ baseURL: baseURL!, storageState: await api.storageState() })
    const page = await ctx.newPage()
    const seen: string[] = []
    watch(page, seen)
    const req = trackRequests(page)
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('a[href="/users"]')).toHaveCount(0)
    await page.goto('/users')
    await expect(page).not.toHaveURL(/\/users$/)
    expect(req.usersReads, 'viewer must not trigger any /api/users request').toEqual([])
    await ctx.close()
    await api.dispose()
    expect(seen.filter(m => !/403|Failed to load resource/.test(m))).toEqual([])
  })

  test('server-rendered breadcrumb matches the client label (no lowercase raw segment, no hydration drift)', async ({ request }) => {
    // Uses the default admin session; the response body is only inspected, never logged.
    const res = await request.get('/users', { headers: { accept: 'text/html' } })
    expect(res.status()).toBe(200)
    const html = (await res.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    const crumb = html.match(/<nav[^>]*border-b[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? ''
    expect(crumb, 'breadcrumb rendered on the server').not.toBe('')
    const labels = [...crumb.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => m[1]!.replace(/<[^>]+>/g, '').trim()).filter(Boolean)
    expect(labels).toEqual(['Dashboard', 'Users'])
    expect(html).toContain('<h1 class="text-xl font-bold">Users</h1>')
  })

  test('an unauthenticated visitor to /users is redirected to /login with no users request', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    const req = trackRequests(page)
    await page.goto('/users')
    await expect(page).toHaveURL(/\/login/)
    expect(req.usersReads).toEqual([])
    await ctx.close()
  })
})

test.describe('Users overview screenshots (mocked rows)', () => {
  test.skip(!SHOTS, 'OIDC_E2E_SHOTS_DIR not set')
  const sizes = { desktop: { width: 1440, height: 900 }, mobile320: { width: 320, height: 640 } }
  const shot = (page: Page, name: string, fullPage = false) => { mkdirSync(SHOTS!, { recursive: true }); return page.screenshot({ path: join(SHOTS!, `${name}.png`), fullPage }) }

  for (const lang of ['en', 'de'] as const) {
    for (const [sizeName, viewport] of Object.entries(sizes)) {
      test(`users overview (${lang}, ${sizeName})`, async ({ page, request }) => {
        try {
          await page.setViewportSize(viewport)
          await page.route('**/api/users', route => json(route, [...USERS, row({ username: `very.long.username.${'x'.repeat(40)}`, display_name: 'Überlanger Anzeigename mit vielen Wörtern', auth_provider: 'oidc' })]))
          await page.goto('/users')
          if (lang === 'de') await switchLang(page, 'de')
          await expect(page.locator('h1').first()).toHaveText(T[lang].users)
          await expect(cell(page, 'alice.local')).toBeVisible()
          await shot(page, `users-polish-${lang}-${sizeName}`)
          if (sizeName === 'mobile320') {
            await scroller(page).evaluate((el) => { el.scrollLeft = el.scrollWidth })
            await shot(page, `users-polish-${lang}-${sizeName}-scrolled`)
          }
        } finally {
          await restoreEnglish(page, request, lang)
        }
      })
    }
  }

  test('users overview states: empty and error (en, desktop)', async ({ page }) => {
    test.info().annotations.push({ type: 'expect-console', description: 'Failed to load resource|500' })
    await page.setViewportSize(sizes.desktop)
    await page.route('**/api/users', route => json(route, []))
    await page.goto('/users')
    await expect(page.locator('h1').first()).toHaveText(T.en.users)
    // Terminal state: loading indicator gone, empty-state heading shown.
    await expect(page.getByText('Loading accounts…')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'No accounts yet' })).toBeVisible()
    await shot(page, 'users-polish-en-desktop-empty')
    await page.unroute('**/api/users')
    await page.route('**/api/users', route => json(route, { statusMessage: 'x' }, 500))
    await page.reload()
    await expect(page.locator('h1').first()).toHaveText(T.en.users)
    // Terminal state: loading indicator gone, load-failed alert and retry button shown.
    await expect(page.getByText('Loading accounts…')).toHaveCount(0)
    await expect(page.getByText('Users could not be loaded')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await shot(page, 'users-polish-en-desktop-error')
  })
})
