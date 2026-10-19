import { randomUUID } from 'node:crypto'
import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

interface Site {
  id: string
  slug: string
  name: string
}

interface Profile {
  id: string
  username: string
  display_name: string
  role: 'admin' | 'viewer'
  language: 'en' | 'de'
  start_site_id: string | null
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const START_SITE_LABEL = /^(Start site|Startstandort)$/
const SITE_SWITCHER_LABEL = /^(Switch site|Standort wechseln)$/
const ACCOUNT_TAB = /^(Account|Konto)$/
const SAVE_PROFILE = /^(Save Profile|Profil speichern)$/
const AUTOMATIC = /^(Automatic|Automatisch)$/
const USERNAME_LABEL = /^(Username|Benutzername)\s*\*?$/
const PASSWORD_LABEL = /^(Password|Passwort)\s*\*?$/
const PASSWORD = `Start-site-${randomUUID()}`

function localBaseUrl(): string {
  const baseURL = test.info().project.use.baseURL
  expect(typeof baseURL).toBe('string')
  const url = new URL(baseURL as string)
  expect(LOCAL_HOSTS.has(url.hostname), 'start-site E2E must target a local isolated app').toBe(true)
  return url.origin
}

function watchErrors(page: Page, errors: string[]) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
}

async function getProfile(api: APIRequestContext): Promise<Profile> {
  const response = await api.get('/api/auth/me')
  expect(response.ok(), 'GET /api/auth/me').toBe(true)
  return await response.json() as Profile
}

async function getSites(api: APIRequestContext): Promise<Site[]> {
  const response = await api.get('/api/sites')
  expect(response.ok(), 'GET /api/sites').toBe(true)
  const body = await response.json() as { data?: Site[] } | Site[]
  return Array.isArray(body) ? body : body.data ?? []
}

async function createSite(api: APIRequestContext, name: string): Promise<Site> {
  const response = await api.post('/api/sites', { data: { name } })
  expect(response.status(), 'create synthetic start-site fixture').toBe(201)
  return await response.json() as Site
}

async function waitForNuxtHydration(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as (Element & { __vue_app__?: unknown }) | null
    return Boolean(root?.__vue_app__)
  })
}

async function openAccount(page: Page, role: 'admin' | 'viewer') {
  const settingsMounted = role === 'admin'
    ? page.waitForResponse(response =>
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/oidc/config'
      )
    : undefined
  await page.goto('/settings')
  if (settingsMounted) {
    // This GET is unique to Settings.vue's admin onMounted; the sidebar also requests /api/sites.
    expect((await settingsMounted).ok(), 'Settings onMounted OIDC config GET').toBe(true)
  } else {
    await waitForNuxtHydration(page)
  }
  const accountTab = page.getByRole('tab', { name: ACCOUNT_TAB })
  await expect(accountTab).toBeVisible()
  await accountTab.click()
  await expect(accountTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('combobox', { name: START_SITE_LABEL })).toBeVisible()
}

async function chooseStartSite(page: Page, option: RegExp | string) {
  await page.getByRole('combobox', { name: START_SITE_LABEL }).click()
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click()
}

async function saveStartSite(page: Page, userId: string): Promise<{ start_site_id?: string | null }> {
  const saved = page.waitForResponse((response) => {
    const request = response.request()
    return request.method() === 'PUT'
      && new URL(response.url()).pathname === `/api/users/${userId}`
  })
  await page.getByRole('button', { name: SAVE_PROFILE }).click()
  const response = await saved
  expect(response.ok(), 'save account profile through the UI').toBe(true)
  return response.request().postDataJSON() as { start_site_id?: string | null }
}

async function cleanupRequest(
  failures: string[],
  label: string,
  action: () => Promise<{ status(): number }>,
  allowedStatuses: number[] = [200]
) {
  try {
    const response = await action()
    if (!allowedStatuses.includes(response.status())) failures.push(`${label}: HTTP ${response.status()}`)
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

test('start site selection, automatic fallback, deletion, and explicit site routes (#298)', async ({ page, request }) => {
  test.setTimeout(90000)
  localBaseUrl()
  const errors: string[] = []
  watchErrors(page, errors)

  let profile: Profile | undefined
  let profileWrites = 0
  page.on('request', request => {
    if (profile && request.method() === 'PUT'
      && new URL(request.url()).pathname === `/api/users/${profile.id}`) profileWrites++
  })
  const createdSites: Site[] = []
  try {
    profile = await getProfile(request)
    expect(profile.role).toBe('admin')

    const suffix = randomUUID()
    const chosenSite = await createSite(request, `Start Site ${suffix}`)
    createdSites.push(chosenSite)
    const otherSite = await createSite(request, `Start Site Other ${suffix}`)
    createdSites.push(otherSite)

    // The API list is already alphabetically ordered. Read it after fixture creation instead of
    // assuming either synthetic name sorts ahead of existing sites.
    const sitesBefore = await getSites(request)
    expect(sitesBefore.length).toBeGreaterThan(0)
    const automaticSite = sitesBefore[0]!

    await openAccount(page, 'admin')
    await page.evaluate(userId => localStorage.removeItem(`ezswm:last-visited-site:${userId}`), profile.id)
    await chooseStartSite(page, AUTOMATIC)
    const automaticBody = await saveStartSite(page, profile.id)
    expect(automaticBody).toMatchObject({ start_site_id: null })
    expect((await getProfile(request)).start_site_id).toBeNull()

    await page.goto('/')
    await page.waitForURL(url => url.pathname === `/sites/${automaticSite.slug}`)

    // A valid explicit site route wins, records this browser's visit, and survives a reload.
    await page.goto(`/sites/${otherSite.slug}/switches`)
    await page.waitForURL(url => url.pathname === `/sites/${otherSite.slug}/switches`)
    // SSR already matches the URL; wait until SiteSwitcher has loaded sites and recorded the visit.
    await expect(page.getByRole('button', { name: SITE_SWITCHER_LABEL })).toContainText(otherSite.name, { timeout: 30000 })
    await page.goto('/')
    await page.waitForURL(url => url.pathname === `/sites/${otherSite.slug}`)
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/sites/${otherSite.slug}$`))
    await page.goto('/')
    await page.waitForURL(url => url.pathname === `/sites/${otherSite.slug}`)

    // A new page in the same browser profile reads the durable local history too.
    const reopenedPage = await page.context().newPage()
    watchErrors(reopenedPage, errors)
    await reopenedPage.goto('/')
    await reopenedPage.waitForURL(url => url.pathname === `/sites/${otherSite.slug}`)
    await reopenedPage.close()
    expect(profileWrites, 'navigation must not write the account preference').toBe(1)

    await page.goto('/settings')
    const switcher = page.getByRole('button', { name: SITE_SWITCHER_LABEL })
    await expect(switcher).toContainText(otherSite.name)
    await openAccount(page, 'admin')
    await chooseStartSite(page, chosenSite.name)
    const fixedBody = await saveStartSite(page, profile.id)
    expect(fixedBody).toMatchObject({ start_site_id: chosenSite.id })
    expect((await getProfile(request)).start_site_id).toBe(chosenSite.id)

    await page.goto('/settings')
    await expect(switcher).toContainText(chosenSite.name)
    await switcher.click()
    await page.getByRole('option', { name: otherSite.name, exact: true }).click()
    await page.waitForURL(url => url.pathname === `/sites/${otherSite.slug}`)
    await expect(switcher).toContainText(otherSite.name)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('link', { name: /^(Settings|Einstellungen)$/ }).click()
    await page.waitForURL(url => url.pathname === '/settings')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(switcher).toContainText(chosenSite.name)

    await page.goto(`/sites/${otherSite.slug}/switches`)
    await page.waitForURL(url => url.pathname === `/sites/${otherSite.slug}/switches`)
    await expect(switcher).toContainText(otherSite.name)
    await page.goto('/')
    await page.waitForURL(url => url.pathname === `/sites/${chosenSite.slug}`)
    await expect(switcher).toContainText(chosenSite.name)
    expect(profileWrites, 'site navigation must not write the account preference').toBe(2)
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/sites/${chosenSite.slug}$`))
    expect((await getProfile(request)).start_site_id).toBe(chosenSite.id)

    const deleted = await request.delete(`/api/sites/${chosenSite.id}`)
    expect(deleted.status()).toBe(204)
    const fallbackSites = await getSites(request)
    expect(fallbackSites.length).toBeGreaterThan(0)
    const fallbackSite = fallbackSites[0]!
    expect((await getProfile(request)).start_site_id).toBeNull()

    await page.goto('/')
    await page.waitForURL(url => url.pathname === `/sites/${fallbackSite.slug}`)
    await openAccount(page, 'admin')
    await expect(page.getByRole('combobox', { name: START_SITE_LABEL })).toContainText(AUTOMATIC)
    expect(errors).toEqual([])
  } finally {
    const cleanupFailures: string[] = []
    if (profile) {
      await cleanupRequest(cleanupFailures, 'restore original admin start-site preference', () =>
        request.put(`/api/users/${profile!.id}`, { data: { start_site_id: profile!.start_site_id } }))
    }
    for (const site of createdSites.reverse()) {
      await cleanupRequest(cleanupFailures, `delete synthetic site ${site.id}`, () =>
        request.delete(`/api/sites/${site.id}`), [204, 404])
    }
    expect(cleanupFailures, 'fixture cleanup').toEqual([])
  }
})

test('viewer can set a personal start site without changing the admin preference (#298)', async ({ page, request, browser }) => {
  test.setTimeout(90000)
  const origin = localBaseUrl()
  const adminErrors: string[] = []
  watchErrors(page, adminErrors)

  let admin: Profile | undefined
  let viewer: Profile | undefined
  let viewerContext: BrowserContext | undefined
  const createdSites: Site[] = []
  const cleanupFailures: string[] = []

  try {
    admin = await getProfile(request)
    expect(admin.role).toBe('admin')

    const site = await createSite(request, `Viewer Start Site ${randomUUID()}`)
    createdSites.push(site)
    const username = `start_site_${randomUUID().replaceAll('-', '').slice(0, 12)}`
    const password = PASSWORD
    const createdUser = await request.post('/api/users', {
      data: { username, display_name: `E2E ${username}`, password, role: 'viewer', language: admin.language }
    })
    expect(createdUser.status()).toBe(201)
    viewer = await createdUser.json() as Profile

    viewerContext = await browser.newContext({ baseURL: origin })
    const viewerPage = await viewerContext.newPage()
    const viewerErrors: string[] = []
    watchErrors(viewerPage, viewerErrors)
    const loginMounted = viewerPage.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/oidc/status'
    )
    await viewerPage.goto(new URL('/login', origin).toString())
    expect((await loginMounted).ok(), 'client-mounted GET /api/auth/oidc/status').toBe(true)
    await viewerPage.getByLabel(USERNAME_LABEL).fill(username)
    await viewerPage.getByLabel(PASSWORD_LABEL).fill(password)
    await viewerPage.getByRole('button', { name: /^(Login|Anmelden)$/ }).click()
    await viewerPage.waitForURL(url => url.pathname.startsWith('/sites/'))

    await openAccount(viewerPage, 'viewer')
    await chooseStartSite(viewerPage, site.name)
    const body = await saveStartSite(viewerPage, viewer.id)
    expect(body).toMatchObject({ start_site_id: site.id })
    const viewerMeResponse = await viewerPage.context().request.get(new URL('/api/auth/me', origin).toString())
    expect(viewerMeResponse.ok()).toBe(true)
    const viewerMe = await viewerMeResponse.json() as Profile
    expect(viewerMe).toMatchObject({ id: viewer.id, role: 'viewer', start_site_id: site.id })
    expect((await getProfile(request)).start_site_id).toBe(admin.start_site_id)

    await viewerPage.goto(new URL('/', origin).toString())
    await viewerPage.waitForURL(url => url.pathname === `/sites/${site.slug}`)
    expect(viewerErrors).toEqual([])
    expect(adminErrors).toEqual([])
  } finally {
    if (viewerContext) await viewerContext.close()
    if (viewer) {
      await cleanupRequest(cleanupFailures, 'restore viewer start-site preference', () =>
        request.put(`/api/users/${viewer!.id}`, { data: { start_site_id: viewer!.start_site_id } }))
      await cleanupRequest(cleanupFailures, 'delete synthetic viewer', () =>
        request.delete(`/api/users/${viewer!.id}`), [204, 404])
    }
    if (admin) {
      await cleanupRequest(cleanupFailures, 'restore original admin start-site preference', () =>
        request.put(`/api/users/${admin!.id}`, { data: { start_site_id: admin!.start_site_id } }))
    }
    for (const site of createdSites.reverse()) {
      await cleanupRequest(cleanupFailures, `delete synthetic site ${site.id}`, () =>
        request.delete(`/api/sites/${site.id}`), [204, 404])
    }
    expect(cleanupFailures, 'fixture cleanup').toEqual([])
  }
})
