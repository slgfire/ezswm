import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Overview port miniatures: single preview, collapsed stack preview (first two
// members, the rest named) with keyboard/touch expand, missing template fallback, grid/list, phone widths.

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

test('switch overview shows compact port miniatures and expandable stack members', async ({ browser, page, request }) => {
  const suffix = randomUUID().slice(0, 8)
  let siteId = ''
  let templateId = ''
  const switchIds: string[] = []
  const errors: string[] = []

  try {
    const site = await request.post('/api/sites', { data: { name: `Mini ${suffix}` } })
    expect(site.status()).toBe(201)
    siteId = (await site.json() as Created).id

    const tpl = await request.post('/api/layout-templates', {
      data: {
        name: `Mini ${suffix}`,
        units: [{ unit_number: 1, label: 'Front', blocks: [
          { type: 'rj45', count: 24, start_index: 1, rows: 2, row_layout: 'odd-even', label: 'Gi1/0/1' },
          { type: 'sfp+', count: 4, start_index: 25, rows: 1 }
        ] }]
      }
    })
    expect(tpl.status()).toBe(201)
    templateId = (await tpl.json() as Created).id

    async function createSwitch(name: string, extra: Record<string, unknown>) {
      const res = await request.post('/api/switches', { data: { site_id: siteId, name, ...extra } })
      expect(res.status()).toBe(201)
      const sw = await res.json() as Created & { ports: Array<{ id: string, unit: number, index: number }> }
      switchIds.push(sw.id)
      return sw
    }
    const single = await createSwitch(`Mini single ${suffix}`, { layout_template_id: templateId })
    const stack = await createSwitch(`Mini stack ${suffix}`, { layout_template_id: templateId, stack_size: 3 })
    await createSwitch(`Mini duo ${suffix}`, { layout_template_id: templateId, stack_size: 2 })
    await createSwitch(`Mini quad ${suffix}`, { layout_template_id: templateId, stack_size: 4 })
    await createSwitch(`Mini none ${suffix}`, {})
    // Unmapped stack: ports kept, template removed, so members cannot be told apart.
    const flat = await createSwitch(`Mini flat ${suffix}`, { layout_template_id: templateId, stack_size: 2 })
    const unlinked = await request.put(`/api/switches/${flat.id}`, { data: { layout_template_id: null } })
    expect(unlinked.ok(), 'unlink template').toBe(true)
    const flatBody = await unlinked.json() as { layout_template_id?: string | null, ports: unknown[] }
    expect(flatBody.layout_template_id ?? null).toBeNull()
    expect(flatBody.ports).toHaveLength(56)

    // Real status: one port up on the single switch and on stack member 2.
    for (const [sw, unit] of [[single, 1], [stack, 2]] as const) {
      const p = sw.ports.find(port => port.unit === unit && port.index === 1)!
      const res = await request.put(`/api/switches/${sw.id}/ports/${p.id}`, { data: { status: 'up' } })
      expect(res.ok(), `set port status for ${sw.id}`).toBe(true)
    }

    const language = (await (await request.get('/api/auth/me')).json() as { language?: string }).language
    const de = language === 'de'
    const showLabel = de ? 'Ports anzeigen (3 Member)' : 'Show ports (3 members)'
    const showFlatLabel = de ? 'Ports anzeigen (2 Member)' : 'Show ports (2 members)'
    const hideLabel = de ? 'Ports ausblenden' : 'Hide ports'
    const member2 = de ? 'Member 2: Portvorschau: 1 aktiv, 27 inaktiv, 0 deaktiviert' : 'Member 2: Port preview: 1 up, 27 down, 0 disabled'
    const moreOne = de ? '+1 weiterer Member (M3)' : '+1 further member (M3)'
    const moreTwo = de ? '+2 weitere Member (M3–M4)' : '+2 further members (M3–M4)'
    const listLabel = de ? 'Listenansicht' : 'List View'

    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

    for (const view of ['grid', 'list'] as const) {
      await page.setViewportSize({ width: 1280, height: 900 })
      await gotoSettled(page, `/sites/${siteId}/switches`)
      if (view === 'list') await page.getByRole('button', { name: listLabel, exact: true }).click()
      const card = (name: string) => page.locator('.card-glow').filter({ hasText: name }).first()

      // Single switch: faceplate preview with real status, no tab stops.
      const singleMini = card(`Mini single ${suffix}`).getByTestId('switch-port-miniature')
      await expect(singleMini).toBeVisible({ timeout: 30000 })
      await expect(singleMini.locator('[data-status]')).toHaveCount(28)
      await expect(singleMini.locator('[data-status="up"]')).toHaveCount(1)
      await expect(singleMini.locator('button, a, [tabindex]')).toHaveCount(0)

      // No template: real ports still shown, page keeps working.
      await expect(card(`Mini none ${suffix}`)).toBeVisible()

      // Stacks: collapsed preview shows the first two members with the single-card faceplate
      // (M1/M2 inside the frame); further members are named above it with the disclosure; a fully
      // shown two-member stack has no disclosure. The footer always counts the whole stack.
      const members = (name: string) => card(name).getByTestId('switch-port-miniature-members').locator('[data-member]')
      for (const [name, size, more] of [[`Mini duo ${suffix}`, 2, null], [`Mini stack ${suffix}`, 3, moreOne], [`Mini quad ${suffix}`, 4, moreTwo]] as const) {
        const mini = card(name).getByTestId('switch-port-miniature')
        await expect(members(name)).toHaveCount(2)
        await expect(members(name).first().locator('[role="img"]')).toContainText('M1')
        await expect(members(name).nth(1).locator('[role="img"]')).toContainText('M2')
        await expect(mini.locator('[data-status]')).toHaveCount(56)
        await expect(card(name).getByText(new RegExp(`^${size * 28} ports$`, 'i'))).toBeVisible()
        if (!more) {
          await expect(mini.getByTestId('switch-port-miniature-more')).toHaveCount(0)
          await expect(mini.locator('button')).toHaveCount(0)
          continue
        }
        await expect(mini.getByTestId('switch-port-miniature-more')).toContainText(more)
        // The card's staggered slide-up moves it between separate bbox reads: let it finish, then compare in one frame.
        await card(name).evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
        const rowBottoms = await mini.evaluate(el => ({
          frameTop: el.querySelector('[data-member]')!.getBoundingClientRect().top,
          bottoms: [el.querySelector('[data-testid="switch-port-miniature-more"]'), el.querySelector('button[aria-controls]')].map(n => n!.getBoundingClientRect().bottom),
        }))
        for (const bottom of rowBottoms.bottoms) {
          expect(bottom, `${name}: row above the faceplates`).toBeLessThanOrEqual(rowBottoms.frameTop)
        }
      }

      // Unmapped two-member stack: ports are not all visible, so the disclosure stays.
      const flatMini = card(`Mini flat ${suffix}`).getByTestId('switch-port-miniature')
      const flatToggle = flatMini.getByRole('button', { name: showFlatLabel })
      await expect(flatToggle).toHaveAttribute('aria-expanded', 'false')
      await expect(flatMini.locator('[data-status]')).toHaveCount(0)
      // Read aria-controls before clicking: the accessible name changes once expanded.
      const flatPanel = page.locator(`#${await flatToggle.getAttribute('aria-controls')}`)
      await flatToggle.click()
      await expect(flatPanel.locator('[data-status]')).toHaveCount(56)
      await expect(flatMini.locator('[data-member]')).toHaveCount(0)
      await flatMini.locator('button[aria-controls]').click()
      await expect(flatMini.locator('[data-status]')).toHaveCount(0)

      if (view === 'grid') {
        // Faceplates line up with a single switch's: same left edge and same gap above the footer.
        const frameToFooter = async (name: string) => {
          const c = card(name)
          const cardBox = (await c.boundingBox())!
          const frame = (await c.getByTestId('switch-port-miniature-members').locator('[role="img"]').last().boundingBox())!
          const footer = (await c.getByText(/^\d+ ports$/i).boundingBox())!
          return { left: Math.round(frame.x - cardBox.x), gap: Math.round(footer.y - (frame.y + frame.height)) }
        }
        const reference = await frameToFooter(`Mini single ${suffix}`)
        for (const name of [`Mini duo ${suffix}`, `Mini stack ${suffix}`, `Mini quad ${suffix}`]) {
          expect(await frameToFooter(name), `${name}: faceplate alignment`).toEqual(reference)
        }
      }
      // Single faceplate cells and stack member cells use the same size.
      const cellSize = async (name: string) => (await card(name).locator('[data-status]').first().boundingBox())!
      expect(await cellSize(`Mini stack ${suffix}`)).toMatchObject({ width: (await cellSize(`Mini single ${suffix}`)).width, height: (await cellSize(`Mini single ${suffix}`)).height })
      await page.screenshot({ path: `${test.info().outputDir}/port-miniatures-1280-${view}.png`, fullPage: true })

      const stackCard = card(`Mini stack ${suffix}`)
      const stackMini = stackCard.getByTestId('switch-port-miniature')

      await expect(stackMini.getByRole('button', { name: showLabel })).toHaveAttribute('aria-expanded', 'false')
      const toggle = stackMini.locator('button[aria-controls]')
      const url = page.url()
      await toggle.click()
      expect(page.url()).toBe(url)
      await expect(stackMini.getByRole('button', { name: hideLabel })).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator(`#${await toggle.getAttribute('aria-controls')}`)
      await expect(panel.getByRole('img', { name: member2 })).toBeVisible()
      await expect(panel.locator('[data-member]')).toHaveCount(3)
      await expect(panel.locator('[data-status]')).toHaveCount(84)
      await expect(panel.locator('[data-status="up"]')).toHaveCount(1)
      await expect(stackMini.getByTestId('switch-port-miniature-more')).toHaveCount(0)
      await expect(stackCard.getByText(/^84 ports$/i)).toBeVisible()
      await page.screenshot({ path: `${test.info().outputDir}/port-miniatures-1280-${view}-expanded.png`, fullPage: true })

      // Keyboard collapse/expand.
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(stackMini.locator('[data-status]')).toHaveCount(56)
      await page.keyboard.press('Space')
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(page.url()).toBe(url)
    }

    // Touch phones: tap expands without navigating, nothing overflows.
    const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() })
    try {
      const touchPage = await touch.newPage()
      touchPage.on('pageerror', e => errors.push(e.message))
      touchPage.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
      for (const width of [390, 320]) {
        await touchPage.setViewportSize({ width, height: 844 })
        await gotoSettled(touchPage, `/sites/${siteId}/switches`)
        const stackMini = touchPage.locator('.card-glow').filter({ hasText: `Mini stack ${suffix}` }).first().getByTestId('switch-port-miniature')
        await expect(stackMini.getByRole('button', { name: showLabel })).toBeVisible({ timeout: 30000 })
        const toggle = stackMini.locator('button[aria-controls]')
        const url = touchPage.url()
        await toggle.tap()
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        expect(touchPage.url()).toBe(url)
        await noHorizontalOverflow(touchPage)
        const box = (await toggle.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(36)
        // Collapsed: the "+N more members" line and the toggle must not overlap on narrow cards.
        await toggle.tap()
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        const more = (await stackMini.getByTestId('switch-port-miniature-more').boundingBox())!
        const closed = (await toggle.boundingBox())!
        const overlaps = more.x < closed.x + closed.width && closed.x < more.x + more.width && more.y < closed.y + closed.height && closed.y < more.y + more.height
        expect(overlaps, `more line overlaps toggle at ${width}px`).toBe(false)
        await noHorizontalOverflow(touchPage)
        await touchPage.screenshot({ path: `${test.info().outputDir}/port-miniatures-${width}.png`, fullPage: true })
      }
    } finally {
      await touch.close()
    }

    expect(errors).toEqual([])
  } finally {
    for (const id of switchIds) await removeOwned(request, `/api/switches/${id}`)
    if (templateId) await removeOwned(request, `/api/layout-templates/${templateId}`)
    if (siteId) await removeOwned(request, `/api/sites/${siteId}`)
  }
})

type Box = { x: number, y: number, width: number, height: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test('switch grid cards keep identity, details and tags together without blank slots', async ({ browser, page, request }) => {
  const suffix = randomUUID().slice(0, 8)
  let siteId = ''
  const switchIds: string[] = []
  const errors: string[] = []
  const longName = `Card long ${suffix} ${'core-aggregation-distribution-'.repeat(2)}end`
  const longLocation = `Building C, 4th floor, east wing, network room 4.117, rack 12 ${'x'.repeat(60)}`
  const longIp = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
  const tags = Array.from({ length: 12 }, (_, i) => `tag-${i + 1}-${suffix}`)

  try {
    const site = await request.post('/api/sites', { data: { name: `Card ${suffix}` } })
    expect(site.status()).toBe(201)
    siteId = (await site.json() as Created).id
    for (const data of [
      { name: longName, manufacturer: 'Hewlett Packard Enterprise Networking', model: 'Aruba CX 6300M 48-port HPE Smart Rate PoE', location: longLocation, management_ip: longIp, role: 'distribution', tags },
      { name: `Card details ${suffix}`, model: 'USW-24', location: 'HALLO', management_ip: '10.0.0.1' },
      { name: `Card ip ${suffix}`, management_ip: '10.0.0.2' },
      { name: `Card bare ${suffix}` }
    ]) {
      const res = await request.post('/api/switches', { data: { site_id: siteId, ...data } })
      expect(res.status()).toBe(201)
      switchIds.push((await res.json() as Created).id)
    }

    async function checkLayout(p: Page, label: string) {
      await noHorizontalOverflow(p)
      const card = (name: string) => p.locator('.card-glow').filter({ has: p.locator('h3', { hasText: name }) }).first()
      await expect(card(`Card details ${suffix}`)).toBeVisible({ timeout: 30000 })

      // Details sit right under the name/model, not pushed towards the footer.
      for (const name of [`Card details ${suffix}`, `Card ip ${suffix}`, longName]) {
        const c = card(name)
        const heading = (await c.locator('h3').boundingBox())!
        const details = (await c.getByTestId('switch-card-details').boundingBox())!
        expect(details.y - (heading.y + heading.height), `${label}: details gap for ${name}`).toBeLessThan(40)
        const cardBox = (await c.boundingBox())!
        expect(details.x + details.width, `${label}: details inside ${name}`).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)
      }

      // Long values are truncated visually but keep their full text as title.
      const long = card(longName)
      await expect(long.locator('h3')).toHaveAttribute('title', longName)
      await expect(long.getByTitle(longLocation)).toBeVisible()
      await expect(long.getByTitle(longIp)).toBeVisible()
      // Every tag stays visible inside the card (no clipped single-line strip).
      const longBox = (await long.boundingBox())!
      for (const tag of tags) {
        const b = (await long.getByText(tag, { exact: true }).boundingBox())!
        expect(b, `${label}: ${tag} visible`).toBeTruthy()
        expect(b.y + b.height, `${label}: ${tag} inside card`).toBeLessThanOrEqual(longBox.y + longBox.height)
        expect(b.x + b.width, `${label}: ${tag} inside card width`).toBeLessThanOrEqual(longBox.x + longBox.width + 1)
      }

      // Bare card has no reserved blank slots: no details block, footer follows the heading closely.
      const bare = card(`Card bare ${suffix}`)
      await expect(bare.getByTestId('switch-card-details')).toHaveCount(0)

      // Cards sharing a row keep their footers aligned.
      const rows = new Map<number, number[]>()
      for (const c of await p.locator('.card-glow').all()) {
        const box = (await c.boundingBox())!
        const footer = (await c.getByText(/^\d+ ports$/i).boundingBox())!
        const key = Math.round(box.y)
        rows.set(key, [...(rows.get(key) ?? []), Math.round(footer.y)])
      }
      for (const [, footers] of rows) expect(Math.max(...footers) - Math.min(...footers), `${label}: footer alignment`).toBeLessThanOrEqual(1)

      // Static touch actions (or hidden desktop actions) never cover the name.
      const actions = p.locator('.switch-card-actions').first()
      if (await actions.evaluate(el => getComputedStyle(el).position === 'static')) {
        for (const c of await p.locator('.card-glow').all()) {
          const a = (await c.locator('.switch-card-actions').boundingBox())!
          const h = (await c.locator('h3').boundingBox())!
          expect(overlaps(a, h), `${label}: actions overlap heading`).toBe(false)
        }
      }
    }

    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.setViewportSize({ width: 1280, height: 900 })
    await gotoSettled(page, `/sites/${siteId}/switches`)
    await checkLayout(page, 'desktop 1280')
    await page.screenshot({ path: `${test.info().outputDir}/card-layout-1280.png`, fullPage: true })

    const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 }, storageState: await page.context().storageState() })
    try {
      const touchPage = await touch.newPage()
      touchPage.on('pageerror', e => errors.push(e.message))
      touchPage.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
      for (const width of [390, 320]) {
        await touchPage.setViewportSize({ width, height: 844 })
        await gotoSettled(touchPage, `/sites/${siteId}/switches`)
        await checkLayout(touchPage, `touch ${width}`)
        await touchPage.screenshot({ path: `${test.info().outputDir}/card-layout-${width}.png`, fullPage: true })
      }
    } finally {
      await touch.close()
    }

    expect(errors).toEqual([])
  } finally {
    for (const id of switchIds) await removeOwned(request, `/api/switches/${id}`)
    if (siteId) await removeOwned(request, `/api/sites/${siteId}`)
  }
})
