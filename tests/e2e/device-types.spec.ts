import { randomUUID } from 'node:crypto'
import { test, expect, type BrowserContext, type Page } from '@playwright/test'

interface Profile {
  id: string
  role: 'admin' | 'viewer'
  language: 'en' | 'de'
}

interface Site { id: string, slug: string }
interface Network { id: string, slug?: string }
interface Allocation { id: string, device_type?: string, hostname?: string }
interface CustomDeviceType { id: string, name: string, active: boolean }

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const TAB = /^(Categories|Kategorien)$/
const BUILT_IN_GROUP = /^(Built-in categories|Integrierte Kategorien)$/
const CUSTOM_GROUP = /^(Custom categories|Eigene Kategorien)$/
const SERVER_DISABLE = /^(Disable Server for new assignments|Kategorie Server für neue Zuweisungen deaktivieren)$/
const SERVER_ENABLE = /^(Enable Server for new assignments|Kategorie Server für neue Zuweisungen aktivieren)$/
const CATEGORY_NAME = /^(Category name|Kategoriename)$/
const ADD_CATEGORY = /^(Add category|Kategorie hinzufügen)$/
const RENAME = /^(Rename|Umbenennen)$/
const DEACTIVATE = /^(Deactivate|Deaktivieren)$/
const SAVE = /^(Save|Speichern)$/
const DELETE = /^(Delete|Löschen)$/
const USERNAME = `device_types_${randomUUID().replaceAll('-', '').slice(0, 12)}`
const PASSWORD = `Device-type-${randomUUID()}`

function assertLocalTarget() {
  const baseURL = test.info().project.use.baseURL
  expect(typeof baseURL).toBe('string')
  expect(LOCAL_HOSTS.has(new URL(baseURL as string).hostname), 'device-type E2E must use an isolated local app').toBe(true)
}

function watchErrors(page: Page, errors: string[]) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('admins manage IP allocation categories and viewers cannot manage them', async ({ page, request, browser }) => {
  test.setTimeout(120000)
  assertLocalTarget()
  const errors: string[] = []
  watchErrors(page, errors)

  let admin: Profile | undefined
  let viewer: Profile | undefined
  let viewerContext: BrowserContext | undefined
  let site: Site | undefined
  let customType: CustomDeviceType | undefined
  let unusedType: CustomDeviceType | undefined

  try {
    const me = await request.get('/api/auth/me')
    expect(me.ok(), 'admin session is ready').toBe(true)
    admin = await me.json() as Profile
    expect(admin.role).toBe('admin')

    const suffix = randomUUID()
    const subnetOctet = Number.parseInt(suffix.slice(0, 2), 16) % 250
    const siteResponse = await request.post('/api/sites', { data: { name: `Device Type ${suffix}` } })
    expect(siteResponse.status()).toBe(201)
    site = await siteResponse.json() as Site
    const networkResponse = await request.post('/api/networks', {
      data: {
        site_id: site.id,
        name: `Device Type Network ${suffix}`,
        subnet: `10.232.${subnetOctet}.0/24`
      }
    })
    expect(networkResponse.status()).toBe(201)
    const network = await networkResponse.json() as Network

    const typesReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/device-types'
    )
    const settingsReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/settings'
    )
    const oidcReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/oidc/config'
    )
    await page.goto('/settings')
    expect((await typesReady).ok(), 'Settings mounted device-type list request').toBe(true)
    expect((await settingsReady).ok(), 'Settings loaded category settings').toBe(true)
    expect((await oidcReady).ok(), 'Settings mounted admin OIDC request').toBe(true)
    await page.getByRole('tab', { name: TAB }).click()
    await expect(page.getByRole('heading', { name: BUILT_IN_GROUP })).toBeVisible()
    await expect(page.getByRole('heading', { name: CUSTOM_GROUP })).toBeVisible()

    let builtinSave = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/settings'
    )
    await page.getByRole('switch', { name: SERVER_DISABLE }).click()
    let builtinResponse = await builtinSave
    expect(builtinResponse.ok()).toBe(true)
    expect(builtinResponse.request().postDataJSON()).toEqual({ disabled_builtin_device_types: ['server'] })
    expect(await builtinResponse.json()).toMatchObject({ disabled_builtin_device_types: ['server'] })

    builtinSave = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/settings'
    )
    await page.getByRole('switch', { name: SERVER_ENABLE }).click()
    builtinResponse = await builtinSave
    expect(builtinResponse.ok()).toBe(true)
    expect(builtinResponse.request().postDataJSON()).toEqual({ disabled_builtin_device_types: [] })

    const unusedName = `Unused ${randomUUID()}`
    await page.getByRole('textbox', { name: CATEGORY_NAME }).fill(unusedName)
    const unusedCreateRequest = page.waitForResponse(response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/device-types'
    )
    await page.getByRole('button', { name: ADD_CATEGORY }).click()
    const unusedCreateResponse = await unusedCreateRequest
    expect(unusedCreateResponse.status()).toBe(201)
    unusedType = await unusedCreateResponse.json() as CustomDeviceType
    const unusedRow = page.locator('li').filter({ hasText: unusedName })
    await unusedRow.getByRole('button', { name: new RegExp(`^(Delete ${escapeRegex(unusedName)}|${escapeRegex(unusedName)} löschen)$`) }).click()
    const deleteDialog = page.getByRole('dialog')
    await expect(deleteDialog).toBeVisible()
    const unusedDeleteRequest = page.waitForResponse(response =>
      response.request().method() === 'DELETE' && new URL(response.url()).pathname === `/api/device-types/${unusedType!.id}`
    )
    await deleteDialog.getByRole('button', { name: DELETE }).click()
    expect((await unusedDeleteRequest).status()).toBe(204)
    await expect(unusedRow).toHaveCount(0)
    unusedType = undefined

    const originalName = `Room device ${suffix}`
    const renamedName = `Console equipment ${suffix}`
    const categoryInput = page.getByRole('textbox', { name: CATEGORY_NAME })
    await categoryInput.fill(originalName)
    const createRequest = page.waitForResponse(response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/device-types'
    )
    await page.getByRole('button', { name: ADD_CATEGORY }).click()
    const createResponse = await createRequest
    expect(createResponse.status()).toBe(201)
    customType = await createResponse.json() as CustomDeviceType
    expect(customType).toMatchObject({ name: originalName, active: true })
    expect(customType.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    const customTypeId = customType.id

    let row = page.locator('li').filter({ hasText: originalName })
    await expect(row).toHaveCount(1)
    await row.getByRole('button', { name: RENAME }).click()
    const editInput = page.getByRole('textbox', { name: CATEGORY_NAME }).nth(1)
    await editInput.fill(renamedName)
    const editingRow = editInput.locator('xpath=ancestor::li[1]')
    const renameRequest = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/device-types/${customType!.id}`
    )
    await editingRow.getByRole('button', { name: SAVE }).click()
    const renameResponse = await renameRequest
    expect(renameResponse.ok()).toBe(true)
    expect(renameResponse.request().postDataJSON()).toEqual({ name: renamedName })
    customType = await renameResponse.json() as CustomDeviceType
    expect(customType).toMatchObject({ id: customTypeId, name: renamedName, active: true })
    const renamedTypesResponse = await request.get('/api/device-types')
    expect(renamedTypesResponse.ok()).toBe(true)
    expect((await renamedTypesResponse.json() as CustomDeviceType[]).find(type => type.id === customType!.id)?.name).toBe(renamedName)

    const allocationResponse = await request.post(`/api/networks/${network.id}/allocations`, {
      data: { ip_address: `10.232.${subnetOctet}.10`, hostname: 'Before edit', device_type: customType.id }
    })
    expect(allocationResponse.status()).toBe(201)
    const allocation = await allocationResponse.json() as Allocation
    expect(allocation.device_type).toBe(customType.id)

    const refreshedTypesReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/device-types'
    )
    const refreshedSettingsReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/settings'
    )
    const refreshedOidcReady = page.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/oidc/config'
    )
    await page.reload()
    expect((await refreshedTypesReady).ok()).toBe(true)
    expect((await refreshedSettingsReady).ok()).toBe(true)
    expect((await refreshedOidcReady).ok()).toBe(true)
    await page.getByRole('tab', { name: TAB }).click()
    row = page.locator('li').filter({ hasText: renamedName })
    await expect(row.getByText(/^(Uses: 1|Verwendungen: 1)$/)).toBeVisible()
    await expect(row.getByRole('button', { name: new RegExp(`^(Delete ${escapeRegex(renamedName)}|${escapeRegex(renamedName)} löschen)$`) })).toBeDisabled()
    await expect(row.getByText(/(Existing assignments use this category|Bestehende Zuweisungen verwenden diese Kategorie)/)).toBeVisible()

    const deactivateRequest = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/device-types/${customType!.id}`
    )
    await row.getByRole('button', { name: DEACTIVATE }).click()
    const deactivateResponse = await deactivateRequest
    expect(deactivateResponse.ok()).toBe(true)
    expect(deactivateResponse.request().postDataJSON()).toEqual({ active: false })
    customType = await deactivateResponse.json() as CustomDeviceType
    expect(customType).toMatchObject({ active: false, name: renamedName })

    // Inactive category stays on the existing allocation while an unrelated field is edited.
    await page.goto(`/sites/${site.slug}/subnets/${network.slug || network.id}`)
    await page.getByText('Before edit', { exact: true }).click()
    const editor = page.getByRole('dialog')
    await expect(editor.getByRole('combobox', { name: /^(Device Type|Gerätetyp)$/ })).toContainText(renamedName)
    await editor.getByRole('textbox', { name: /^(Hostname)$/ }).fill('After edit')
    const allocationUpdate = page.waitForResponse(response =>
      response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/networks/${network.slug || network.id}/allocations/${allocation.id}`
    )
    await editor.getByRole('button', { name: SAVE }).click()
    const allocationUpdateResponse = await allocationUpdate
    expect(allocationUpdateResponse.ok()).toBe(true)
    expect(allocationUpdateResponse.request().postDataJSON()).toMatchObject({ hostname: 'After edit', device_type: customType.id })
    const persistedResponse = await request.get(`/api/networks/${network.id}/allocations/${allocation.id}`)
    expect(persistedResponse.ok()).toBe(true)
    expect(await persistedResponse.json()).toMatchObject({ hostname: 'After edit', device_type: customType.id })

    const userResponse = await request.post('/api/users', {
      data: { username: USERNAME, display_name: 'Device type viewer', password: PASSWORD, role: 'viewer', language: admin.language }
    })
    expect(userResponse.status()).toBe(201)
    viewer = await userResponse.json() as Profile
    viewerContext = await browser.newContext({ baseURL: new URL(test.info().project.use.baseURL as string).origin })
    const viewerPage = await viewerContext.newPage()
    watchErrors(viewerPage, errors)
    const loginReady = viewerPage.waitForResponse(response =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/oidc/status'
    )
    await viewerPage.goto('/login')
    expect((await loginReady).ok(), 'login mounted OIDC status request').toBe(true)
    await viewerPage.getByLabel(/^(Username|Benutzername)\s*\*?$/).fill(USERNAME)
    await viewerPage.getByLabel(/^(Password|Passwort)\s*\*?$/).fill(PASSWORD)
    await viewerPage.getByRole('button', { name: /^(Login|Anmelden)$/ }).click()
    await viewerPage.waitForURL(url => url.pathname.startsWith('/sites/'))
    await viewerPage.goto('/settings')
    await expect(viewerPage.getByRole('tab', { name: /^(General|Allgemein)$/ })).toHaveCount(0)
    await expect(viewerPage.getByRole('tab', { name: TAB })).toHaveCount(0)

    const viewerApi = viewerContext.request
    const viewerTypes = await viewerApi.get('/api/device-types')
    expect(viewerTypes.ok(), 'viewers may read device types').toBe(true)
    const forbiddenCreate = await viewerApi.post('/api/device-types', { data: { name: `Viewer denied ${suffix}` } })
    expect(forbiddenCreate.status(), 'viewers cannot create device types').toBe(403)
    const forbiddenUpdate = await viewerApi.put(`/api/device-types/${customType.id}`, { data: { active: true } })
    expect(forbiddenUpdate.status(), 'viewers cannot reactivate device types').toBe(403)
    expect(errors).toEqual([])
  } finally {
    if (viewerContext) await viewerContext.close()
    if (viewer) {
      const deleted = await request.delete(`/api/users/${viewer.id}`)
      expect([204, 404]).toContain(deleted.status())
    }
    if (unusedType) {
      const deleted = await request.delete(`/api/device-types/${unusedType.id}`)
      expect([204, 404]).toContain(deleted.status())
    }
    if (customType) {
      const deleted = await request.delete(`/api/device-types/${customType.id}`)
      if (deleted.status() === 409) {
        const deactivated = await request.put(`/api/device-types/${customType.id}`, { data: { active: false } })
        expect(deactivated.ok(), 'leave only an inactive synthetic category if cleanup cannot clear its allocation').toBe(true)
      } else {
        expect([204, 404]).toContain(deleted.status())
      }
    }
    if (site) {
      const deleted = await request.delete(`/api/sites/${site.id}`)
      expect([204, 404]).toContain(deleted.status())
    }
  }
})
