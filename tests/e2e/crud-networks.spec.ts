import { test, expect, type APIRequestContext } from '@playwright/test'

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

test.describe('Network CRUD', () => {
  test('create network', async ({ page, context }) => {
    const site = await e2eSite(context.request)
    // Cleanup any leftover (name-targeted, inside the E2E site only)
    for (const n of await siteRows(context.request, 'networks', site.id)) {
      if (n.name === 'Server-Net') {
        await context.request.delete(`/api/networks/${n.id}`)
      }
    }

    await page.goto(`/sites/${site.route}/subnets/create`)
    await page.waitForLoadState('networkidle')

    // Fill form fields by finding inputs inside the form
    const form = page.locator('main form, main .max-w-2xl')
    const inputs = form.locator('input[type="text"], input:not([type])')
    await inputs.nth(0).fill('Server-Net')      // name
    await inputs.nth(1).fill('10.0.1.0/24')     // subnet
    await inputs.nth(2).fill('10.0.1.1')        // gateway

    await page.getByRole('button', { name: /save|speichern/i }).click()
    await page.waitForURL(detailUrl(site.route, 'subnets'), { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Server-Net')
  })

  test('network appears in list', async ({ page, request }) => {
    const site = await e2eSite(request)
    await page.goto(`/sites/${site.route}/subnets`)
    await page.waitForTimeout(2000)
    await expect(page.locator('main')).toContainText('Server-Net', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('10.0.1.0/24')
  })

  test('edit subnet can clear and reassign its VLAN', async ({ page, request }) => {
    const site = await e2eSite(request)
    const browserErrors: string[] = []
    page.on('pageerror', error => browserErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') browserErrors.push(message.text())
    })
    const vlansResponse = await request.get(`/api/vlans?site_id=${encodeURIComponent(site.id)}`)
    expect(vlansResponse.ok()).toBe(true)
    const vlansBody = await vlansResponse.json() as { data?: Array<{ vlan_id: number }> }
    expect(Array.isArray(vlansBody.data)).toBe(true)
    const usedIds = new Set(vlansBody.data!.map(v => v.vlan_id))
    const vlanId = Array.from({ length: 4094 }, (_, index) => index + 1).find(id => !usedIds.has(id))
    expect(vlanId, 'an unused VLAN ID is available in the E2E site').toBeDefined()

    const vlanName = `Clear-VLAN-${Date.now()}`
    const vlanResponse = await request.post('/api/vlans', {
      data: { site_id: site.id, vlan_id: vlanId, name: vlanName, color: '#13579B' }
    })
    expect(vlanResponse.status()).toBe(201)
    const vlan = await vlanResponse.json() as { id: string; vlan_id: number; name: string }

    const networkName = `Clear-VLAN-Net-${Date.now()}`
    let networkId: string | undefined
    try {
      const networkResponse = await request.post('/api/networks', {
        data: {
          site_id: site.id,
          name: networkName,
          subnet: '10.253.77.0/24',
          gateway: '10.253.77.1',
          dns_servers: ['1.1.1.1'],
          description: 'Keep these subnet fields unchanged',
          vlan_id: vlan.id
        }
      })
      expect(networkResponse.status()).toBe(201)
      const network = await networkResponse.json() as { id: string; slug: string }
      networkId = network.id

      await page.goto(`/sites/${site.route}/subnets/${network.slug}`)
      await page.getByTitle('Edit').click()

      const vlanSelect = page.getByRole('combobox', { name: 'VLAN' })
      await vlanSelect.click()
      await page.getByRole('option', { name: 'No VLAN', exact: true }).click()
      const clearResponsePromise = page.waitForResponse(res => res.request().method() === 'PUT' && res.url().includes(`/api/networks/${network.slug}`))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const clearResponse = await clearResponsePromise
      expect(clearResponse.ok()).toBe(true)
      expect(clearResponse.request().postDataJSON()).toMatchObject({ vlan_id: null })

      await page.reload()
      const clearedResponse = await request.get(`/api/networks/${networkId}?siteId=${encodeURIComponent(site.id)}`)
      expect(clearedResponse.ok()).toBe(true)
      const cleared = await clearedResponse.json() as Record<string, unknown>
      expect(cleared.vlan_id ?? null).toBeNull()
      expect(cleared).toMatchObject({
        name: networkName,
        subnet: '10.253.77.0/24',
        gateway: '10.253.77.1',
        dns_servers: ['1.1.1.1'],
        description: 'Keep these subnet fields unchanged'
      })

      await page.getByTitle('Edit').click()
      const noVlanSelect = page.getByRole('combobox', { name: 'VLAN' })
      await expect(noVlanSelect).toContainText('No VLAN')
      await noVlanSelect.click()
      await page.getByRole('option', { name: `VLAN ${vlan.vlan_id} - ${vlan.name}`, exact: true }).click()
      const assignResponsePromise = page.waitForResponse(res => res.request().method() === 'PUT' && res.url().includes(`/api/networks/${network.slug}`))
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const assignResponse = await assignResponsePromise
      expect(assignResponse.ok()).toBe(true)
      expect(assignResponse.request().postDataJSON()).toMatchObject({ vlan_id: vlan.id })

      await page.reload()
      const assignedResponse = await request.get(`/api/networks/${networkId}?siteId=${encodeURIComponent(site.id)}`)
      expect(assignedResponse.ok()).toBe(true)
      expect((await assignedResponse.json() as Record<string, unknown>).vlan_id).toBe(vlan.id)
      expect(browserErrors).toEqual([])
    } finally {
      if (networkId) await request.delete(`/api/networks/${networkId}?siteId=${encodeURIComponent(site.id)}`)
      await request.delete(`/api/vlans/${vlan.id}?siteId=${encodeURIComponent(site.id)}`)
    }
  })
})
