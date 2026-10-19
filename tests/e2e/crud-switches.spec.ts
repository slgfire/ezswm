import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'

interface SiteRow { id: string, route: string }
interface Row { id: string, name: string, slug?: string }

/** The one known E2E site (fail-closed: strict envelope, exactly one match, no fallback to another or "all"). */
async function e2eSite(request: APIRequestContext): Promise<SiteRow> {
  const res = await request.get('/api/sites')
  expect(res.ok(), 'GET /api/sites ok').toBe(true)
  const body = await res.json() as { data?: unknown }
  expect(Array.isArray(body?.data), 'sites envelope is { data: [] }').toBe(true)
  const hit = (body.data as Array<Record<string, unknown>>).filter((s) => {
    expect(s && typeof s === 'object', 'site record is an object').toBe(true)
    expect(typeof s.id === 'string' && s.id.length > 0, 'site id is a non-empty string').toBe(true)
    expect(typeof s.name === 'string', 'site name is a string').toBe(true)
    if (s.slug !== undefined) expect(typeof s.slug, 'site slug is a string when present').toBe('string')
    return s.name === 'E2E Site'
  })
  expect(hit, 'exactly one site named E2E Site').toHaveLength(1)
  const slug = hit[0]!.slug as string | undefined
  return { id: hit[0]!.id as string, route: slug || (hit[0]!.id as string) }
}

/** Site-scoped list with a strict { data: [] } envelope (a malformed response fails, it never looks empty). */
async function siteRows(request: APIRequestContext, kind: 'networks' | 'vlans' | 'switches', siteId: string): Promise<Row[]> {
  const res = await request.get(`/api/${kind}?site_id=${encodeURIComponent(siteId)}`)
  expect(res.ok(), `GET /api/${kind} ok`).toBe(true)
  const body = await res.json() as { data?: unknown }
  expect(Array.isArray(body?.data), `${kind} envelope is { data: [] }`).toBe(true)
  for (const r of body.data as Array<Record<string, unknown>>) {
    expect(r && typeof r === 'object', `${kind} record is an object`).toBe(true)
    expect(typeof r.id === 'string' && r.id.length > 0, `${kind} id is a non-empty string`).toBe(true)
    expect(typeof r.name, `${kind} name is a string`).toBe('string')
    if (r.slug !== undefined) expect(typeof r.slug, `${kind} slug is a string when present`).toBe('string')
  }
  return body.data as Row[]
}

/** Detail page of the known site and entity kind (never /create or /edit). */
const detailUrl = (siteRoute: string, kind: 'subnets' | 'vlans' | 'switches') => (url: URL) =>
  new RegExp(`^/sites/${siteRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${kind}/(?!(?:create|edit)$)[^/]+$`).test(url.pathname)

test.describe.serial('Switch CRUD', () => {
  test('create switch', async ({ page, context }) => {
    const site = await e2eSite(context.request)
    // Cleanup any leftover (name-targeted, inside the E2E site only)
    for (const s of await siteRows(context.request, 'switches', site.id)) {
      if (s.name === 'Core-Switch-01') {
        await context.request.delete(`/api/switches/${s.id}`)
      }
    }

    await page.goto(`/sites/${site.route}/switches/create`)
    await page.waitForLoadState('networkidle')

    // Fill form — located by the actual field labels (EN/DE), in the current form
    const form = page.locator('main form')
    await form.getByLabel(/^(Name)(\s*\*)?$/).fill('Core-Switch-01')
    await form.getByLabel(/^(Manufacturer|Hersteller)\b/).fill('Cisco')
    await form.getByLabel(/^(Model|Modell)\b/).fill('2960-24T')
    await form.getByLabel(/^(Management IP|Management-IP)\b/).fill('10.0.0.1')
    await form.getByLabel(/^(Location|Standort)\b/).fill('Hall A')

    await page.getByRole('button', { name: /save|speichern/i }).click()

    // Should navigate to detail page
    await page.waitForURL(detailUrl(site.route, 'switches'), { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Core-Switch-01')
  })

  test('switch appears in list', async ({ page, request }) => {
    const site = await e2eSite(request)
    await page.goto(`/sites/${site.route}/switches`)
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText('Core-Switch-01', { timeout: 5000 })
  })

  test('switch group header toggles from its whitespace and keeps keyboard/action controls', async ({ page, request }) => {
    const site = await e2eSite(request)
    const settingsResponse = await request.get('/api/settings')
    expect(settingsResponse.ok()).toBe(true)
    const settings = await settingsResponse.json() as { switch_groups_enabled?: boolean }
    test.skip(settings.switch_groups_enabled === false, 'switch groups are disabled in this test database')

    let switchId: string | undefined
    let groupId: string | undefined

    try {
      const createdSwitch = await request.post('/api/switches', {
        data: { site_id: site.id, name: `Header switch ${randomUUID()}` }
      })
      expect(createdSwitch.status()).toBe(201)
      switchId = (await createdSwitch.json() as Row).id

      const groupName = `Header ${randomUUID()}`
      const createGroup = await request.post('/api/switch-groups', { data: { site_id: site.id, name: groupName } })
      expect(createGroup.status()).toBe(201)
      groupId = (await createGroup.json() as { id: string }).id

      const assigned = await request.put(`/api/switches/${switchId}?siteId=${encodeURIComponent(site.id)}`, { data: { group_id: groupId } })
      expect(assigned.ok()).toBe(true)
      await page.addInitScript((key: string) => {
        localStorage.setItem(key, JSON.stringify({ viewMode: 'grouped', expanded: [] }))
      }, `ezswm-switch-groups:${site.route}`)
      await page.goto(`/sites/${site.route}/switches`)

      const toggle = page.getByRole('button', { name: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: (Collapse group|Expand group|Gruppe einklappen|Gruppe ausklappen)$`) })
      await expect(toggle).toBeVisible()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const section = page.locator('section').filter({ has: toggle })
      const header = section.locator('header')
      const headerBox = await header.boundingBox()
      expect(headerBox).not.toBeNull()
      await header.click({ position: { x: 2, y: Math.floor(headerBox!.height / 2) } })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')

      await toggle.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await toggle.press('Space')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')

      const dragHandle = header.getByRole('button', { name: /^(Drag to reorder groups|Ziehen, um Gruppen neu anzuordnen)$/ })
      await dragHandle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    } finally {
      if (groupId) {
        const deletedGroup = await request.delete(`/api/switch-groups/${groupId}?siteId=${encodeURIComponent(site.id)}`)
        expect([204, 404]).toContain(deletedGroup.status())
      }
      if (switchId) {
        const deletedSwitch = await request.delete(`/api/switches/${switchId}?siteId=${encodeURIComponent(site.id)}`)
        expect([204, 404]).toContain(deletedSwitch.status())
      }
    }
  })

  test('switch detail shows info', async ({ page, request }) => {
    const site = await e2eSite(request)
    await page.goto(`/sites/${site.route}/switches`)
    await page.waitForTimeout(1000)
    // The switch card is wrapped in a link to the detail page
    await page.locator('main a').filter({ has: page.getByText('Core-Switch-01', { exact: true }) }).first().click()
    await page.waitForURL(detailUrl(site.route, 'switches'))
    await expect(page.locator('body')).toContainText('Cisco')
    await expect(page.locator('body')).toContainText('Hall A')
  })
})
