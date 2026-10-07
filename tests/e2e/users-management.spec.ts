import { test as base, expect, type Page, type Route, type APIRequestContext } from '@playwright/test'

/**
 * Admin Users MANAGEMENT flows (/users): create / edit / delete, OIDC rows, access loss.
 *
 * EVIDENCE LABELS
 *  - [REAL]  talks to the real handlers of an ISOLATED FRESH dev server (synthetic `e2e_um_*` accounts it creates and removes).
 *  - [MOCK]  fulfils requests in the browser with page.route: proves CLIENT behaviour only, never a server guarantee.
 * No real SSO/IdP exists in this harness, so every OIDC row and the permission-loss 403 are [MOCK].
 *
 * Run only against a throw-away instance (see the header of the hand-off): the suite creates/deletes accounts and
 * the last-local-admin case needs the setup admin to be the ONLY local admin.
 */

const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)

/** Every test fails on unexpected console/page errors; deliberate 4xx responses are annotated per test. */
const test = base.extend<{ consoleGuard: undefined }>({
  consoleGuard: [async ({ page }, use, testInfo) => {
    const seen: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') seen.push(`console: ${redact(m.text())}`) })
    page.on('pageerror', e => seen.push(`pageerror: ${redact(e.message)}`))
    await use(undefined)
    const allowed = testInfo.annotations.filter(a => a.type === 'expect-console').map(a => new RegExp(a.description ?? '^$'))
    const unexpected = seen.filter(m => !allowed.some(re => re.test(m)))
    await testInfo.attach('browser-console.txt', { body: seen.length ? seen.join('\n') : '(no console errors or page errors)', contentType: 'text/plain' })
    expect(unexpected, 'unexpected browser console/page errors').toEqual([])
  }, { auto: true }]
})

// Everything here mutates shared state of ONE instance: run strictly in order.
test.describe.configure({ mode: 'serial' })

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const PREFIX = 'e2e_um_'
const uname = (tag: string) => `${PREFIX}${tag}_${Date.now().toString(36)}`
const PASSWORD = 'e2e-um-pass-123'
const EXPECT_4XX = 'Failed to load resource|40[39]'

const T = {
  created: 'Account created successfully.',
  updated: 'Account updated successfully.',
  deleted: 'Account deleted successfully.',
  exists: 'That username is already in use.',
  lastAdmin: 'The last local administrator cannot be removed or changed to Viewer.',
  accessChanged: 'Your access has changed. Editing is no longer available.',
  accessLostTitle: 'User management is no longer available',
  selfDelete: 'You cannot delete your own account.',
  validation: {
    username: 'Username must be between 3 and 50 characters.',
    password: 'Password must be at least 8 characters.'
  }
}

interface ApiUser { id: string, username: string, display_name: string, role: string, language: string, auth_provider: string }

const listUsers = async (api: APIRequestContext) => (await (await api.get('/api/users')).json()) as ApiUser[]
async function seedUser(api: APIRequestContext, username: string, role: 'viewer' | 'admin' = 'viewer') {
  const res = await api.post('/api/users', { data: { username, display_name: `E2E ${username}`, password: PASSWORD, role, language: 'en' } })
  expect(res.status(), 'seed user').toBe(201)
  return (await res.json()) as ApiUser
}
async function cleanup(api: APIRequestContext) {
  for (const u of await listUsers(api)) if (u.username.startsWith(PREFIX)) await api.delete(`/api/users/${u.id}`)
}

/** Records every non-GET /api/ request made by the page. */
function trackMutations(page: Page) {
  const mutating: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/') && r.method() !== 'GET') mutating.push(`${r.method()} ${u.pathname}`)
  })
  return mutating
}

const rowFor = (page: Page, username: string) =>
  page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: username, exact: true }) })
const dialog = (page: Page) => page.getByRole('dialog')
const toast = (page: Page, text: string) => page.getByText(text, { exact: true })

/** The list has finished loading (no loading status, table shown) and the header action is usable. */
async function expectUsersListReady(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: 'Loading accounts' })).toHaveCount(0)
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
}

/** Pick an option of a Nuxt UI select inside the open dialog (select is labelled by its form field). */
async function choose(page: Page, label: string, option: string) {
  await dialog(page).getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test.afterEach(async ({ request }) => { await cleanup(request) })

test.describe('Users management', () => {
  test('[REAL] create a Viewer (defaults), validation + duplicate guard, edit role/name/language, survives reload', async ({ page, request }) => {
    test.info().annotations.push({ type: 'expect-console', description: EXPECT_4XX })
    const name = uname('c')
    const mutating = trackMutations(page)
    await page.goto('/users')
    await expect(page.locator('h1').first()).toHaveText('Users')
    await expectUsersListReady(page)

    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(dialog(page)).toBeVisible()
    // Defaults: Viewer / English.
    await expect(dialog(page).getByRole('combobox', { name: 'Role' })).toContainText('Viewer')
    await expect(dialog(page).getByRole('combobox', { name: 'Language' })).toContainText('English')

    // Client validation blocks the request.
    await dialog(page).getByLabel('Username').fill('ab')
    await dialog(page).getByLabel('Display name').fill('E2E Created')
    await dialog(page).getByLabel('Password').fill('short')
    await dialog(page).getByRole('button', { name: 'Create account' }).click()
    await expect(dialog(page).getByText(T.validation.username)).toBeVisible()
    await expect(dialog(page).getByText(T.validation.password)).toBeVisible()
    expect(mutating, 'invalid form sends nothing').toEqual([])

    // Valid create.
    await dialog(page).getByLabel('Username').fill(name)
    await dialog(page).getByLabel('Password').fill(PASSWORD)
    await dialog(page).getByRole('button', { name: 'Create account' }).click()
    await expect(toast(page, T.created)).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)
    const created = rowFor(page, name)
    await expect(created).toContainText('E2E Created')
    await expect(created).toContainText('Viewer')
    await expect(created).toContainText('Local account')
    expect(mutating).toEqual(['POST /api/users'])

    // Duplicate username: server 409 -> message, dialog stays open, no extra row.
    await page.getByRole('button', { name: 'Create account' }).click()
    await dialog(page).getByLabel('Username').fill(name)
    await dialog(page).getByLabel('Display name').fill('Dup')
    await dialog(page).getByLabel('Password').fill(PASSWORD)
    await dialog(page).getByRole('button', { name: 'Create account' }).click()
    await expect(toast(page, T.exists)).toBeVisible()
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByRole('rowheader', { name, exact: true })).toHaveCount(1)

    // Edit role / display name / language.
    await page.getByRole('button', { name: `Edit account for ${name}` }).click()
    await expect(dialog(page).getByLabel('Display name')).toHaveValue('E2E Created')
    await dialog(page).getByLabel('Display name').fill('E2E Renamed')
    await choose(page, 'Role', 'Admin')
    await choose(page, 'Language', 'German')
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    await expect(toast(page, T.updated)).toBeVisible()
    await expect(dialog(page)).toHaveCount(0)

    // Persisted by the real handler, visible after reload, and no password anywhere.
    await page.reload()
    const after = rowFor(page, name)
    await expect(after).toContainText('E2E Renamed')
    await expect(after).toContainText('Admin')
    await expect(page.locator('body')).not.toContainText(PASSWORD)
    const stored = (await listUsers(request)).find(u => u.username === name)!
    expect([stored.display_name, stored.role, stored.language, stored.auth_provider]).toEqual(['E2E Renamed', 'admin', 'de', 'local'])
    expect(JSON.stringify(stored)).not.toContain('password')
  })

  test('[REAL + MOCK] delete confirm: cancel keeps the row, confirm removes it; self delete disabled; last local admin is protected', async ({ page, request }) => {
    test.info().annotations.push({ type: 'expect-console', description: EXPECT_4XX })
    const victim = await seedUser(request, uname('d'))
    const me = (await (await request.get('/api/auth/me')).json()) as { id: string, username: string }
    await page.goto('/users')
    await expect(rowFor(page, victim.username)).toBeVisible()

    // [REAL] cancel -> nothing deleted.
    const mutating = trackMutations(page)
    await page.getByRole('button', { name: `Delete account ${victim.username}` }).click()
    await expect(dialog(page)).toContainText(`Delete E2E ${victim.username} (${victim.username})?`)
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(rowFor(page, victim.username)).toBeVisible()
    expect(mutating).toEqual([])
    expect((await listUsers(request)).some(u => u.id === victim.id)).toBe(true)

    // [MOCK] a 409 on delete keeps the dialog open and the row listed (server behaviour is proven by the API test + next block).
    await page.route(`**/api/users/${victim.id}`, route => route.request().method() === 'DELETE' ? json(route, { statusMessage: 'x' }, 409) : route.fallback())
    await page.getByRole('button', { name: `Delete account ${victim.username}` }).click()
    await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(toast(page, T.lastAdmin)).toBeVisible()
    await expect(dialog(page)).toBeVisible()
    // While the modal is open the page behind it is aria-hidden (role queries skip it): check the server, then the row after closing.
    expect((await listUsers(request)).some(u => u.id === victim.id)).toBe(true)
    await page.unroute(`**/api/users/${victim.id}`)
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(rowFor(page, victim.username)).toBeVisible()
    // Dismiss the earlier mocked-409 notice through the normal UI so the later real 409 notice is the only one.
    const mockNotice = page.getByRole('listitem').filter({ hasText: T.lastAdmin })
    if (await mockNotice.count()) await mockNotice.getByRole('button').click()
    await expect(mockNotice).toHaveCount(0)

    // [REAL] confirm -> deleted.
    await page.getByRole('button', { name: `Delete account ${victim.username}` }).click()
    await dialog(page).getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(toast(page, T.deleted)).toBeVisible()
    await expect(rowFor(page, victim.username)).toHaveCount(0)
    expect((await listUsers(request)).some(u => u.id === victim.id)).toBe(false)

    // [REAL] own account: delete is disabled and labelled.
    const own = rowFor(page, me.username)
    await expect(own.getByRole('button', { name: T.selfDelete })).toBeDisabled()

    // [REAL] the setup admin is the only local admin: demoting self is rejected by the server (409) and the role stays.
    await page.getByRole('button', { name: `Edit account for ${me.username}` }).click()
    await choose(page, 'Role', 'Viewer')
    const selfDemotion = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === `/api/users/${me.id}`)
    await dialog(page).getByRole('button', { name: 'Save' }).click()
    expect((await selfDemotion).status()).toBe(409)
    await expect(toast(page, T.lastAdmin)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
    expect((await listUsers(request)).find(u => u.username === me.username)!.role).toBe('admin')
  })

  test('[MOCK] OIDC row: no edit, provider-managed label, delete warnings, identity hidden', async ({ page }) => {
    const ISSUER = 'https://idp.hidden.example'
    const SUBJECT = 'sub-HIDDEN-0123456789'
    const ID = '8d0c7a0e-1b2c-4d3e-9f40-aabbccddeeff'
    const ts = '2026-01-01T00:00:00.000Z'
    const base = { language: 'en', is_setup_user: false, created_at: ts, updated_at: ts, oidc_session_version: 0 }
    await page.route('**/api/users', route => route.request().method() === 'GET'
      ? json(route, [
          { ...base, id: crypto.randomUUID(), username: 'local_one', display_name: 'Local One', role: 'admin', auth_provider: 'local', oidc_issuer: null, oidc_subject: null },
          { ...base, id: ID, username: 'olivia_oidc', display_name: 'Olivia OIDC', role: 'viewer', auth_provider: 'oidc', oidc_issuer: ISSUER, oidc_subject: SUBJECT, oidc_session_version: 7 }
        ])
      : json(route, { error: 'unexpected' }, 405))
    const mutating = trackMutations(page)
    await page.goto('/users')
    const oidc = rowFor(page, 'olivia_oidc')
    await expect(oidc).toBeVisible()
    await expect(oidc.getByRole('button', { name: /^Edit account/ })).toHaveCount(0)
    await expect(oidc.getByText('Provider-managed role')).toBeVisible()
    await expect(oidc).toContainText('OpenID Connect')
    // the local row keeps its edit button
    await expect(rowFor(page, 'local_one').getByRole('button', { name: 'Edit account for local_one' })).toBeVisible()

    await oidc.getByRole('button', { name: 'Delete account olivia_oidc' }).click()
    const d = dialog(page)
    await expect(d).toContainText('Delete Olivia OIDC (olivia_oidc)?')
    await expect(d).toContainText("The account's activity history will remain, but its author attribution will be removed.")
    await expect(d).toContainText('This does not revoke access at the identity provider. The account may be recreated at the next permitted SSO sign-in.')
    for (const hidden of [ISSUER, SUBJECT, ID]) {
      await expect(page.locator('body')).not.toContainText(hidden)
      expect(await page.content()).not.toContain(hidden)
    }
    await d.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toHaveCount(0)
    expect(mutating).toEqual([])
  })

  test('[REAL + MOCK] viewer is denied (route, nav, API; zero changes); admin demoted mid-draft gets one notice and no mutation retry', async ({ page, request, browser, baseURL, playwright }) => {
    test.info().annotations.push({ type: 'expect-console', description: EXPECT_4XX })
    const viewerName = uname('v')
    const target = await seedUser(request, viewerName)
    const before = await listUsers(request)

    // [REAL] viewer session: no nav entry, /users redirects before any /api/users call, API writes are 403.
    const vApi = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } })
    expect((await vApi.post('/api/auth/login', { data: { username: viewerName, password: PASSWORD } })).ok()).toBe(true)
    const vCtx = await browser.newContext({ baseURL: baseURL!, storageState: await vApi.storageState() })
    const vPage = await vCtx.newPage()
    const usersCalls: string[] = []
    vPage.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/users')) usersCalls.push(`${r.method()} ${new URL(r.url()).pathname}`) })
    await vPage.goto('/')
    await expect(vPage.locator('h1').first()).toBeVisible()
    await expect(vPage.locator('a[href="/users"]')).toHaveCount(0)
    await vPage.goto('/users')
    await expect(vPage).not.toHaveURL(/\/users$/)
    expect(usersCalls, 'viewer page never calls /api/users').toEqual([])
    await vCtx.close()
    expect((await vApi.post('/api/users', { data: { username: uname('x'), display_name: 'X', password: PASSWORD, role: 'admin', language: 'en' } })).status()).toBe(403)
    expect((await vApi.delete(`/api/users/${target.id}`)).status()).toBe(403)
    await vApi.dispose()
    expect((await listUsers(request)).map(u => u.id).sort(), 'viewer attempts changed nothing').toEqual(before.map(u => u.id).sort())

    // [MOCK] admin demoted while a create draft is open: POST -> 403, then /api/auth/me reports a viewer.
    const me = await (await request.get('/api/auth/me')).json() as Record<string, unknown>
    const mutating = trackMutations(page)
    let meCalls = 0
    await page.goto('/users')
    await expect(rowFor(page, viewerName)).toBeVisible()
    await page.getByRole('button', { name: 'Create account' }).click()
    await dialog(page).getByLabel('Username').fill(uname('draft'))
    await dialog(page).getByLabel('Display name').fill('Draft')
    await dialog(page).getByLabel('Password').fill(PASSWORD)
    await page.route('**/api/auth/me', (route) => { meCalls++; return json(route, { ...me, role: 'viewer' }) })
    await page.route('**/api/users', route => route.request().method() === 'POST' ? json(route, { statusMessage: 'forbidden' }, 403) : route.fallback())
    await dialog(page).getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText(T.accessLostTitle)).toBeVisible()
    await expect(toast(page, T.accessChanged)).toHaveCount(1)
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0)
    await page.waitForTimeout(500)
    expect(mutating, 'exactly one POST, never retried').toEqual(['POST /api/users'])
    expect(meCalls, 'role re-checked').toBeGreaterThan(0)
    expect((await listUsers(request)).map(u => u.id).sort(), 'nothing created').toEqual(before.map(u => u.id).sort())
  })
})
