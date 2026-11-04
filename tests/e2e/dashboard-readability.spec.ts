import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Site dashboard: translated labels, theme-aware readable numbers/warnings,
// IP tile links to the IP address page, no overflow on phones.

interface Created { id: string }

async function removeOwned(request: APIRequestContext, path: string) {
  const response = await request.delete(path)
  expect([200, 204, 404], `cleanup ${path}`).toContain(response.status())
}

// Nuxt fetches its app manifest ~1s after hydration; a following hard goto or context
// close would cancel that body read and log [NUXT_E5002]. Wait for it to complete first.
async function gotoSettled(page: Page, url: string) {
  const manifest = page.waitForResponse(r => /\/_nuxt\/builds\/meta\/[^/?]+\.json$/.test(new URL(r.url()).pathname), { timeout: 30000 })
  await page.goto(url)
  const response = await manifest
  expect(response.status(), 'app manifest status').toBe(200)
  expect(Array.isArray((await response.json() as { prerendered?: unknown }).prerendered), 'app manifest body').toBe(true)
}

async function noHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, view: window.innerWidth }))
  expect(widths.doc).toBeLessThanOrEqual(widths.view)
}

/** WCAG contrast of the element's text (or outline) color against its composited background. */
async function contrast(el: Locator, prop: 'color' | 'outlineColor' = 'color') {
  return el.evaluate((node, prop) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const px = () => Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3))
    const chain: Element[] = []
    // An offset outline sits on the parent's background, not on the element's own.
    for (let e: Element | null = prop === 'color' ? node : node.parentElement; e; e = e.parentElement) chain.unshift(e)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1)
    for (const e of chain) { ctx.fillStyle = getComputedStyle(e).backgroundColor; ctx.fillRect(0, 0, 1, 1) }
    const bg = px()
    ctx.fillStyle = getComputedStyle(node)[prop]; ctx.fillRect(0, 0, 1, 1)
    const fg = px()
    const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! }
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
    return +((hi! + 0.05) / (lo! + 0.05)).toFixed(2)
  }, prop)
}

test('site dashboard is translated and readable in the current theme', async ({ browser, page, request }) => {
  const suffix = randomUUID().slice(0, 8)
  const vlanNumber = 3000 + Math.floor(Math.random() * 900)
  let siteId = ''
  let templateId = ''
  let switchId = ''
  let networkId = ''
  let vlanId = ''
  const allocationIds: string[] = []
  const errors: string[] = []

  try {
    const site = await request.post('/api/sites', { data: { name: `Dash ${suffix}` } })
    expect(site.status()).toBe(201)
    siteId = (await site.json() as Created).id

    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

    // Empty site first: welcome state with the create action for editors, no KPI tiles.
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoSettled(page, `/sites/${siteId}`)
    await expect(page.getByText(/^(Welcome to ezSWM!|Willkommen bei ezSWM!)$/)).toBeVisible({ timeout: 30000 })
    await expect(page.locator(`a[href$="/switches/create"]`).last()).toBeVisible()
    await expect(page.getByTestId('dashboard-kpis')).toHaveCount(0)

    const tpl = await request.post('/api/layout-templates', {
      data: { name: `Dash ${suffix}`, units: [{ unit_number: 1, label: 'Front', blocks: [{ type: 'rj45', count: 24, start_index: 1, rows: 2 }] }] }
    })
    expect(tpl.status()).toBe(201)
    templateId = (await tpl.json() as Created).id

    const sw = await request.post('/api/switches', { data: { site_id: siteId, name: `Dash core ${suffix}`, role: 'core', layout_template_id: templateId } })
    expect(sw.status()).toBe(201)
    const created = await sw.json() as Created & { ports: Array<{ id: string, index: number }> }
    switchId = created.id
    expect((await request.put(`/api/switches/${switchId}`, { data: { is_favorite: true } })).ok()).toBe(true)
    // 3 up, 2 disabled, 19 down
    for (const p of created.ports.filter(port => port.index <= 5)) {
      const res = await request.put(`/api/switches/${switchId}/ports/${p.id}`, { data: { status: p.index <= 3 ? 'up' : 'disabled' } })
      expect(res.ok(), `port ${p.index}`).toBe(true)
    }

    // One fully used /29 (high usage warning) and one VLAN without subnet (orphan warning).
    const net = await request.post('/api/networks', { data: { site_id: siteId, name: `Dash net ${suffix}`, subnet: '203.0.113.0/29' } })
    expect(net.status()).toBe(201)
    networkId = (await net.json() as Created).id
    for (let i = 1; i <= 6; i++) {
      const res = await request.post(`/api/networks/${networkId}/allocations`, { data: { ip_address: `203.0.113.${i}`, hostname: `dash-${i}`, device_type: 'server' } })
      expect(res.status()).toBe(201)
      allocationIds.push((await res.json() as Created).id)
    }
    const vlan = await request.post('/api/vlans', { data: { site_id: siteId, vlan_id: vlanNumber, name: `Dash orphan ${suffix}` } })
    expect(vlan.status()).toBe(201)
    vlanId = (await vlan.json() as Created).id

    const language = (await (await request.get('/api/auth/me')).json() as { language?: string }).language
    const de = language === 'de'
    const T = de
      ? { ip: 'IP-Zuweisungen', up: 'Aktiv', down: 'Inaktiv', disabled: 'Deaktiviert', high: `Dash net ${suffix}: 100 % belegt`, dup: 'Doppelte IP: 192.0.2.99', orphan: `Verwaistes VLAN: Dash orphan ${suffix} (${vlanNumber})`, hint: 'Weitere Subnetze anlegen, um die Auslastung zu verfolgen' }
      : { ip: 'IP Allocations', up: 'Up', down: 'Down', disabled: 'Disabled', high: `Dash net ${suffix}: 100% used`, dup: 'Duplicate IP: 192.0.2.99', orphan: `Orphan VLAN: Dash orphan ${suffix} (${vlanNumber})`, hint: 'Add more subnets to track utilization' }

    // The API rejects duplicate IPs, so only this UI branch gets one injected value.
    await page.context().route('**/api/dashboard/stats**', async (route) => {
      const response = await route.fetch()
      const json = await response.json() as { duplicateIps: string[] }
      await route.fulfill({ response, json: { ...json, duplicateIps: ['192.0.2.99'] } })
    })

    await gotoSettled(page, `/sites/${siteId}`)
    const total = page.getByTestId('dashboard-port-total')
    await expect(total).toHaveText('24', { timeout: 30000 })
    const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    test.info().annotations.push({ type: 'theme', description: dark ? 'dark' : 'light' }, { type: 'language', description: de ? 'de' : 'en' })

    const ipTile = page.getByTestId('dashboard-kpi-ip-allocations')
    await expect(ipTile).toContainText(T.ip)
    await expect(ipTile).toHaveAttribute('href', new RegExp(`/sites/[^/]+/ip-addresses$`))
    for (const text of [T.up, T.down, T.disabled, T.high, T.dup, T.orphan, T.hint]) await expect(page.getByText(text, { exact: true })).toBeVisible()
    await expect(page.getByText('Core', { exact: true })).toBeVisible()
    if (de) for (const english of ['IP Allocations', 'utilization', 'Duplicate IP', 'Orphan VLAN']) await expect(page.getByText(english)).toHaveCount(0)

    const legend = (label: string) => page.getByText(label, { exact: true }).locator('xpath=following-sibling::span[1]')
    const readable: Array<[string, Locator]> = [
      ['port total', total],
      ['IP tile number', ipTile.getByTestId('dashboard-kpi-value')],
      ['up count', legend(T.up)], ['down count', legend(T.down)], ['disabled count', legend(T.disabled)],
      ['up label', page.getByText(T.up, { exact: true })],
      ['high usage warning', page.getByText(T.high, { exact: true })],
      ['duplicate warning', page.getByText(T.dup, { exact: true })],
      ['orphan warning', page.getByText(T.orphan, { exact: true })],
      ['usage percent', page.getByText('100%', { exact: true }).first()]
    ]
    readable.push(['switch count', page.getByTestId('dashboard-kpi-switches').getByTestId('dashboard-kpi-value')])
    const ratios: Record<string, number> = {}
    for (const [name, el] of readable) {
      ratios[name] = await contrast(el)
      expect(ratios[name], `${name} contrast (${dark ? 'dark' : 'light'})`).toBeGreaterThanOrEqual(4.5)
    }
    console.log(`Dashboard contrast ${de ? 'de' : 'en'}/${dark ? 'dark' : 'light'}: ${JSON.stringify(ratios)}`)

    // Desktop hierarchy: four KPI tiles in one row; port health beside the wider IP utilization.
    const tiles = page.getByTestId('dashboard-kpis').locator('a')
    await expect(tiles).toHaveCount(4)
    const tileTops = await Promise.all((await tiles.all()).map(async tile => Math.round((await tile.boundingBox())!.y)))
    expect(new Set(tileTops).size, 'KPI tiles share one row').toBe(1)
    const portCard = (await page.getByTestId('dashboard-port-status').boundingBox())!
    const utilCard = (await page.getByTestId('dashboard-ip-utilization').boundingBox())!
    expect(Math.abs(portCard.y - utilCard.y), 'port status beside IP utilization').toBeLessThanOrEqual(1)
    expect(utilCard.width).toBeGreaterThan(portCard.width)
    await expect(page.getByTestId('dashboard-warnings')).toBeVisible()
    await expect(page.getByTestId('dashboard-activity')).toBeVisible()

    // Keyboard focus on a KPI tile draws a visible outline (>= 3:1 against the page).
    await page.getByTestId('dashboard-kpi-vlans').focus()
    await page.keyboard.press('Tab')
    await expect(ipTile).toBeFocused()
    expect(await ipTile.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid')
    const focusRatio = await contrast(ipTile, 'outlineColor')
    console.log(`Dashboard KPI focus outline ${dark ? 'dark' : 'light'}: ${focusRatio}`)
    expect(focusRatio, 'KPI focus outline contrast').toBeGreaterThanOrEqual(3)
    await page.screenshot({ path: `${test.info().outputDir}/dashboard-1280-focus.png` })
    await page.keyboard.press('Shift+Tab')

    await noHorizontalOverflow(page)
    await page.screenshot({ path: `${test.info().outputDir}/dashboard-1280.png`, fullPage: true })

    const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() })
    try {
      const touchPage = await touch.newPage()
      touchPage.on('pageerror', e => errors.push(e.message))
      touchPage.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
      for (const width of [390, 320]) {
        await touchPage.setViewportSize({ width, height: 844 })
        await gotoSettled(touchPage, `/sites/${siteId}`)
        await expect(touchPage.getByTestId('dashboard-port-total')).toHaveText('24', { timeout: 30000 })
        expect(await touchPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(dark)
        await expect(touchPage.getByText(T.high, { exact: true })).toBeVisible()
        // Phones: KPI tiles form a 2-column grid inside the viewport.
        const phoneTiles = await touchPage.getByTestId('dashboard-kpis').locator('a').all()
        expect(phoneTiles).toHaveLength(4)
        const lefts = new Set<number>()
        for (const tile of phoneTiles) {
          const b = (await tile.boundingBox())!
          lefts.add(Math.round(b.x))
          expect(b.x + b.width, `KPI tile inside ${width}px`).toBeLessThanOrEqual(width)
          expect(b.height, 'KPI tile touch height').toBeGreaterThanOrEqual(44)
          // Long German labels wrap instead of being cut off (touch has no hover title).
          const label = tile.getByTestId('dashboard-kpi-label')
          const fit = await label.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, overflow: getComputedStyle(el).textOverflow, height: el.getBoundingClientRect().height, line: parseFloat(getComputedStyle(el).lineHeight) }))
          // At most two whole-word lines (no orphaned letters such as "Zuweisunge" / "n").
          expect(fit.height, `KPI label lines at ${width}px`).toBeLessThanOrEqual(2 * fit.line + 1)
          expect(fit.scroll, `KPI label fits at ${width}px`).toBeLessThanOrEqual(fit.client + 1)
          expect(fit.overflow).not.toBe('ellipsis')
          const lb = (await label.boundingBox())!
          expect(lb.x + lb.width, 'KPI label inside tile').toBeLessThanOrEqual(b.x + b.width + 1)
        }
        expect(lefts.size, `KPI columns at ${width}px`).toBe(2)
        await expect(touchPage.getByTestId('dashboard-kpi-ip-allocations').getByTestId('dashboard-kpi-label')).toHaveText(T.ip)
        await noHorizontalOverflow(touchPage)
        await touchPage.screenshot({ path: `${test.info().outputDir}/dashboard-${width}.png`, fullPage: true })
      }
    } finally {
      await touch.close()
    }

    // The IP tile opens the IP address page.
    await ipTile.click()
    await expect(page).toHaveURL(/\/ip-addresses$/)

    expect(errors).toEqual([])
  } finally {
    if (networkId) {
      for (const id of allocationIds) await removeOwned(request, `/api/networks/${networkId}/allocations/${id}`)
      await removeOwned(request, `/api/networks/${networkId}`)
    }
    if (vlanId) await removeOwned(request, `/api/vlans/${vlanId}`)
    if (switchId) await removeOwned(request, `/api/switches/${switchId}`)
    if (templateId) await removeOwned(request, `/api/layout-templates/${templateId}`)
    if (siteId) await removeOwned(request, `/api/sites/${siteId}`)
  }
})
