import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

interface SiteRow { id: string; route: string }

async function e2eSite(request: APIRequestContext): Promise<SiteRow> {
  const response = await request.get('/api/sites')
  expect(response.ok(), 'GET /api/sites ok').toBe(true)
  const body = await response.json() as { data?: Array<{ id?: string; name?: string; slug?: string }> }
  const site = body.data?.filter(row => row.name === 'E2E Site') ?? []
  expect(site, 'exactly one E2E Site exists').toHaveLength(1)
  expect(site[0]?.id).toBeTruthy()
  return { id: site[0]!.id!, route: site[0]!.slug || site[0]!.id! }
}

test('switch management links create, update, clear, and remain available to viewers', async ({ page, request, browser, baseURL }) => {
  const site = await e2eSite(request)
  const me = await request.get('/api/auth/me')
  expect(me.ok(), 'GET /api/auth/me ok').toBe(true)
  const language = (await me.json() as { language?: string }).language === 'de' ? 'de' : 'en'
  const t = language === 'de'
    ? { name: 'Name', save: 'Speichern', edit: 'Bearbeiten', list: 'Listenansicht', show: 'Vollständige Switch-Details anzeigen', hide: 'Vollständige Switch-Details ausblenden', open: (n: string) => `Management-Seite für ${n} öffnen`, details: (n: string) => `Switch-Details öffnen: ${n}` }
    : { name: 'Name', save: 'Save', edit: 'Edit', list: 'List View', show: 'Show full switch details', hide: 'Hide full switch details', open: (n: string) => `Open management page for ${n}`, details: (n: string) => `Open switch details: ${n}` }
  const name = `Management Link ${randomUUID()}`
  const browserErrors: string[] = []
  let switchId: string | undefined
  let viewerId: string | undefined
  let viewerContext: BrowserContext | undefined
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })

  try {
    await page.goto(`/sites/${site.route}/switches/create`)
    await page.waitForLoadState('networkidle')
    const form = page.locator('main form')
    await form.getByLabel(/^(Name)(\s*\*)?$/).fill(name)
    await form.getByLabel(/Management IP|Management-IP/i).fill('192.0.2.10')
    await form.getByRole('combobox', { name: /Management protocol|Management-Protokoll/i }).click()
    await page.getByRole('option', { name: 'HTTP', exact: true }).click()
    await form.getByLabel(/Management URL|Management-URL/i).fill('https://switch.example:8443/ui')

    const createResponsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/switches')
    await page.getByRole('button', { name: t.save, exact: true }).click()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(201)
    expect(createResponse.request().postDataJSON()).toMatchObject({
      management_ip: '192.0.2.10',
      management_protocol: 'http',
      management_url: 'https://switch.example:8443/ui'
    })
    const created = await createResponse.json() as { id: string; slug: string }
    switchId = created.id
    await expect(page.locator('main')).toContainText(name)

    let managementLink = page.getByRole('link', { name: t.open(name) })
    await expect(managementLink).toHaveAttribute('href', 'https://switch.example:8443/ui')
    await expect(managementLink).toHaveAttribute('target', '_blank')
    await expect(managementLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(await managementLink.locator('xpath=ancestor::button').count()).toBe(0)

    const detailToggle = page.getByRole('button', { name: t.show })
    await detailToggle.press('Enter')
    await expect(page.getByRole('button', { name: t.hide })).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: t.hide }).press('Space')
    await expect(page.getByRole('button', { name: t.show })).toHaveAttribute('aria-expanded', 'false')

    await page.getByRole('button', { name: t.edit, exact: true }).click()
    await page.getByLabel(/Management URL|Management-URL/i).fill('http://192.0.2.20:8080/custom')
    const editResponsePromise = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.startsWith('/api/switches/'))
    await page.getByRole('button', { name: t.save, exact: true }).click()
    const editResponse = await editResponsePromise
    expect(editResponse.ok()).toBe(true)
    expect(editResponse.request().postDataJSON()).toMatchObject({
      management_protocol: 'http',
      management_url: 'http://192.0.2.20:8080/custom'
    })

    await page.reload()
    managementLink = page.getByRole('link', { name: t.open(name) })
    await expect(managementLink).toHaveAttribute('href', 'http://192.0.2.20:8080/custom')

    await page.getByRole('button', { name: t.edit, exact: true }).click()
    await page.getByLabel(/Management URL|Management-URL/i).fill('')
    const clearResponsePromise = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname.startsWith('/api/switches/'))
    await page.getByRole('button', { name: t.save, exact: true }).click()
    const clearResponse = await clearResponsePromise
    expect(clearResponse.ok()).toBe(true)
    expect(clearResponse.request().postDataJSON()).toMatchObject({ management_url: null })

    await page.reload()
    managementLink = page.getByRole('link', { name: t.open(name) })
    await expect(managementLink).toHaveAttribute('href', 'http://192.0.2.10/')

    await page.goto(`/sites/${site.route}/switches`)
    const cardDetails = page.getByRole('link', { name: t.details(name) })
    await expect(cardDetails).toBeVisible()
    let cardManagementLink = page.getByRole('link', { name: t.open(name) })
    await expect(cardManagementLink).toHaveAttribute('href', 'http://192.0.2.10/')
    await expect(cardManagementLink).toHaveAttribute('target', '_blank')
    await expect(cardManagementLink).toHaveAttribute('rel', 'noopener noreferrer')

    await page.getByRole('button', { name: t.list }).click()
    await expect(page.getByRole('button', { name: t.list })).toHaveAttribute('aria-pressed', 'true')
    cardManagementLink = page.getByRole('link', { name: t.open(name) })
    await expect(cardManagementLink).toHaveAttribute('href', 'http://192.0.2.10/')
    await page.getByRole('link', { name: t.details(name) }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toContainText(name)

    const viewerName = `management_viewer_${randomUUID().replaceAll('-', '').slice(0, 16)}`
    const viewerPassword = 'management-viewer-password'
    const viewerResponse = await request.post('/api/users', {
      data: { username: viewerName, display_name: 'Management Viewer', password: viewerPassword, role: 'viewer', language: 'de' }
    })
    expect(viewerResponse.status()).toBe(201)
    viewerId = (await viewerResponse.json() as { id: string }).id
    expect(baseURL).toBeTruthy()
    viewerContext = await browser.newContext()
    const login = await viewerContext.request.post(`${baseURL}/api/auth/login`, { data: { username: viewerName, password: viewerPassword } })
    expect(login.ok()).toBe(true)
    const loginBody = await login.json() as { token: string }
    await viewerContext.addCookies([{ name: 'ezswm_token', value: loginBody.token, url: baseURL!, httpOnly: true, sameSite: 'Lax' }])
    const viewerPage = await viewerContext.newPage()
    viewerPage.on('pageerror', error => browserErrors.push(error.message))
    viewerPage.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
    await viewerPage.goto(`${baseURL}/sites/${site.route}/switches`)
    const viewerCard = viewerPage.getByRole('link', { name: `Switch-Details öffnen: ${name}` })
    await expect(viewerCard).toBeVisible()
    const viewerManagementLink = viewerPage.getByRole('link', { name: `Management-Seite für ${name} öffnen` })
    await expect(viewerManagementLink).toHaveAttribute('href', 'http://192.0.2.10/')
    await expect(viewerManagementLink).toHaveAttribute('target', '_blank')
    await viewerCard.focus()
    await viewerPage.keyboard.press('Enter')
    await expect(viewerPage.locator('main')).toContainText(name)
    await expect(viewerPage.getByRole('link', { name: `Management-Seite für ${name} öffnen` })).toHaveAttribute('href', 'http://192.0.2.10/')

    expect(browserErrors).toEqual([])
  } finally {
    await viewerContext?.close()
    if (viewerId) await request.delete(`/api/users/${viewerId}`)
    if (switchId) await request.delete(`/api/switches/${switchId}?siteId=${encodeURIComponent(site.id)}`)
  }
})
