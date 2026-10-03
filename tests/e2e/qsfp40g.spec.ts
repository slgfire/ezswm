import { test as base, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/**
 * #287 — 40G QSFP in the compiled UI (8 cases). Everything runs against OWN synthetic fixtures (a site, templates and a
 * switch created through the API per test; every known id is deleted + verified 404 even after setup/test failures). Baseline accounts/site/settings are never
 * written. Selectors are the normal accessible UI (labels/roles); no forced clicks, Vue internals or private state.
 * The only language is English (the DE header-menu intermittence is out of scope here).
 * Strict console/page-error accounting: every console error and page error fails the test (no allowances).
 */
const CANDIDATE_BASE = 'http://127.0.0.1:3105'
const redact = (text: string) => text.replace(/\?[^\s'")]*/g, '?<redacted>').replace(/[A-Za-z0-9_-]{32,}/g, '<token>').slice(0, 300)

const test = base.extend<{ consoleGuard: undefined }>({
  consoleGuard: [async ({ page }, use) => {
    const seen: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') seen.push(`console: ${redact(m.text())}`) })
    page.on('pageerror', e => seen.push(`pageerror: ${redact(e.message)}`))
    await use(undefined)
    expect(seen, 'unexpected browser console/page errors').toEqual([])
  }, { auto: true }]
})

interface Port { id: string, index: number, type: string, speed?: string | null }
interface Fixture { siteId: string | null, siteSlug: string | null, templateId: string | null, switchId: string | null, switchSlug: string | null, extraTemplateIds: string[], tag: string }
interface FixtureOptions { blocks?: unknown[], withSwitch?: boolean }

const uniq = () => `qsfp40g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
// DECODER-BEGIN
/**
 * Fail-closed list decoder for the real list GET shapes: a bare array, `{ items: [] }` (layout templates) or `{ data: [] }`
 * (sites, switches). Anything else THROWS (never defaults to []). When the envelope states a total (`total` or `meta.total`)
 * it must equal the list length (these GETs are used unfiltered/unpaginated). An empty list is only valid as a real [] .
 */
function listOf(body: unknown, what: string): Array<Record<string, unknown>> {
  let list: unknown
  if (Array.isArray(body)) {
    list = body
  } else if (body !== null && typeof body === 'object') {
    const o = body as Record<string, unknown>
    const hasItems = Array.isArray(o.items)
    const hasData = Array.isArray(o.data)
    if (hasItems === hasData) throw new Error(`${what}: list envelope must have exactly one array of items/data`)
    list = hasItems ? o.items : o.data
    const meta = o.meta
    const metaTotal = meta !== null && typeof meta === 'object' ? (meta as Record<string, unknown>).total : undefined
    const total = o.total !== undefined ? o.total : metaTotal
    if (total !== undefined && total !== (list as unknown[]).length) throw new Error(`${what}: envelope total does not match the list length`)
  } else {
    throw new Error(`${what}: response is not a list`)
  }
  for (const e of list as unknown[]) if (e === null || typeof e !== 'object' || Array.isArray(e)) throw new Error(`${what}: list entry is not an object`)
  return list as Array<Record<string, unknown>>
}
// DECODER-END

async function ok<T>(res: import('@playwright/test').APIResponse): Promise<T> {
  expect(res.ok(), `API ${res.status()}`).toBe(true)
  return await res.json() as T
}

/**
 * Deletes ONLY the fixture's own KNOWN ids (switch, template(s), site), then proves each is gone (404).
 * Every known id is attempted even when one step fails; failures are collected and thrown at the END (never swallowed).
 * Limit: a dropped connection can leave a record behind - this reports it, it cannot guarantee transport-level recovery.
 */
async function cleanup(request: APIRequestContext, fx: Fixture): Promise<void> {
  const targets: Array<[string, string]> = []
  if (fx.switchId) targets.push([`/api/switches/${fx.switchId}`, 'switch'])
  for (const id of [fx.templateId, ...fx.extraTemplateIds]) if (id) targets.push([`/api/layout-templates/${id}`, 'template'])
  if (fx.siteId) targets.push([`/api/sites/${fx.siteId}`, 'site'])
  const failures: string[] = []
  for (const [path, what] of targets) {
    try {
      const status = (await request.delete(path)).status()
      if (![200, 204, 404].includes(status)) failures.push(`${what} delete status ${status}`)
    } catch { failures.push(`${what} delete request failed`) }
  }
  for (const [path, what] of targets) {
    try {
      const status = (await request.get(path)).status()
      if (status !== 404) failures.push(`${what} still present (status ${status})`)
    } catch { failures.push(`${what} verification request failed`) }
  }
  if (failures.length) throw new Error(`fixture cleanup incomplete: ${failures.join('; ')}`)
}

/** Builds the own site (+ optional template and switch) and REGISTERS every created id immediately on `fx`. */
async function populate(request: APIRequestContext, fx: Fixture, o: FixtureOptions) {
  const baselineIds = new Set(listOf(await ok(await request.get('/api/sites')), 'sites').map(s => String(s.id)))
  const site = await ok<{ id: string, slug: string }>(await request.post('/api/sites', { data: { name: `QSFP ${fx.tag}` } }))
  expect(baselineIds.has(site.id), 'the fixture site is new').toBe(false)
  fx.siteId = site.id
  fx.siteSlug = site.slug
  if (!o.blocks) return
  const tpl = await ok<{ id: string }>(await request.post('/api/layout-templates', { data: { name: `tpl ${fx.tag}`, units: [{ unit_number: 1, blocks: o.blocks }] } }))
  fx.templateId = tpl.id
  if (!o.withSwitch) return
  const sw = await ok<{ id: string, slug: string }>(await request.post('/api/switches', { data: { site_id: site.id, name: `sw ${fx.tag}`, layout_template_id: tpl.id } }))
  fx.switchId = sw.id
  fx.switchSlug = sw.slug
}

/**
 * Fixture lifecycle: setup failures clean up whatever was already created before rethrowing; the body's own failure and a
 * cleanup failure are BOTH reported (AggregateError) - neither hides the other.
 */
async function withFixture(request: APIRequestContext, o: FixtureOptions, body: (fx: Fixture) => Promise<void>): Promise<void> {
  const fx: Fixture = { siteId: null, siteSlug: null, templateId: null, switchId: null, switchSlug: null, extraTemplateIds: [], tag: uniq() }
  let failure: unknown
  try {
    await populate(request, fx, o)
    await body(fx)
  } catch (e) { failure = e }
  try {
    await cleanup(request, fx)
  } catch (c) {
    if (failure) throw new AggregateError([failure, c], 'test failed AND fixture cleanup failed', { cause: c })
    throw c
  }
  if (failure) throw failure
}

const ports = async (request: APIRequestContext, fx: Fixture) =>
  (await ok<{ ports: Port[] }>(await request.get(`/api/switches/${fx.switchId}`))).ports
const speedsOf = (p: Port[], type: string) => p.filter(x => x.type === type).sort((a, b) => a.index - b.index).map(x => x.speed ?? null)

// Template: 2 RJ45 (1G) then 2 QSFP with the given default speed.
const BLOCKS = (qsfpSpeed: string) => [
  { type: 'rj45', count: 2, start_index: 1, rows: 1, label: 'RJ', default_speed: '1G' },
  { type: 'qsfp', count: 2, start_index: 3, rows: 1, label: 'QSFP', default_speed: qsfpSpeed }
]

const openSwitch = async (page: Page, fx: Fixture) => {
  await page.goto(`/sites/${fx.siteSlug}/switches/${fx.switchSlug}`)
  await expect(page.locator('.port-glow').first()).toBeVisible()
}
const qsfpPort = (page: Page, n: number) => page.locator('.port-glow').filter({ has: page.locator('.port-type-label', { hasText: /^Q$/ }) }).nth(n)
const rjPort = (page: Page, n: number) => page.locator('.port-glow').filter({ hasNot: page.locator('.port-type-label') }).nth(n)

/** Opens a speed select and returns its option names in DOM order, then closes it again. */
async function listSpeeds(page: Page, select: Locator): Promise<string[]> {
  await select.click()
  const options = page.getByRole('option')
  await expect(options.first()).toBeVisible()
  const names = (await options.allTextContents()).map(t => t.trim())
  await page.keyboard.press('Escape')
  await expect(options).toHaveCount(0)
  return names
}
async function pickSpeed(page: Page, select: Locator, name: string) {
  await select.click()
  await page.getByRole('option', { name, exact: true }).click()
}
/** 40G sits directly between 10G and 100G and every previous value is still offered. */
function expectFortyGigOrder(names: string[]) {
  const i = names.indexOf('10G')
  expect(i, '10G offered').toBeGreaterThanOrEqual(0)
  expect(names.slice(i, i + 3), '10G, 40G, 100G in order').toEqual(['10G', '40G', '100G'])
  for (const s of ['100M', '1G', '2.5G']) expect(names, `${s} still offered`).toContain(s)
}

test.describe('40G QSFP (own synthetic fixtures, compiled UI)', () => {
  // Exact candidate before ANY write or readback.
  test.beforeEach(({ baseURL }) => { expect(baseURL, `baseURL must be exactly ${CANDIDATE_BASE}`).toBe(CANDIDATE_BASE) })

  test('[panel] the port side panel offers 40G between 10G and 100G', async ({ page, request }) => {
    await withFixture(request, { blocks: BLOCKS('100G'), withSwitch: true }, async (fx) => {
      await openSwitch(page, fx)
      await qsfpPort(page, 0).click()
      const panel = page.getByRole('dialog')
      await expect(panel).toBeVisible()
      expectFortyGigOrder(await listSpeeds(page, panel.getByLabel('Speed', { exact: true })))
    })
  })

  test('[panel] saving 40G on one QSFP port persists it and leaves the other ports unchanged', async ({ page, request }) => {
    await withFixture(request, { blocks: BLOCKS('100G'), withSwitch: true }, async (fx) => {
      await openSwitch(page, fx)
      await qsfpPort(page, 0).click()
      const panel = page.getByRole('dialog')
      await pickSpeed(page, panel.getByLabel('Speed', { exact: true }), '40G')
      await panel.getByRole('button', { name: 'Save', exact: true }).click()
      await expect.poll(async () => speedsOf(await ports(request, fx), 'qsfp')).toEqual(['40G', '100G'])
      expect(speedsOf(await ports(request, fx), 'rj45'), 'other ports keep their defaults').toEqual(['1G', '1G'])
    })
  })

  test('[bulk] the bulk editor offers 40G in order and applies it to the selected QSFP ports only', async ({ page, request }) => {
    await withFixture(request, { blocks: BLOCKS('100G'), withSwitch: true }, async (fx) => {
      await openSwitch(page, fx)
      await qsfpPort(page, 0).click({ modifiers: ['Control'] })
      await qsfpPort(page, 1).click({ modifiers: ['Control'] })
      await page.getByRole('button', { name: 'Bulk Edit Ports', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const speed = dialog.getByLabel('Speed', { exact: true })
      expectFortyGigOrder(await listSpeeds(page, speed))
      await pickSpeed(page, speed, '40G')
      await dialog.getByRole('button', { name: /^Apply to \d+ port/ }).click()
      await expect.poll(async () => speedsOf(await ports(request, fx), 'qsfp')).toEqual(['40G', '40G'])
      expect(speedsOf(await ports(request, fx), 'rj45'), 'unselected ports unchanged').toEqual(['1G', '1G'])
    })
  })

  test('[bulk] a mixed RJ45 + QSFP selection applies 40G to exactly those ports', async ({ page, request }) => {
    await withFixture(request, { blocks: BLOCKS('100G'), withSwitch: true }, async (fx) => {
      await openSwitch(page, fx)
      await rjPort(page, 0).click({ modifiers: ['Control'] })
      await qsfpPort(page, 1).click({ modifiers: ['Control'] })
      await page.getByRole('button', { name: 'Bulk Edit Ports', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await pickSpeed(page, dialog.getByLabel('Speed', { exact: true }), '40G')
      await dialog.getByRole('button', { name: /^Apply to \d+ port/ }).click()
      await expect.poll(async () => speedsOf(await ports(request, fx), 'qsfp')).toEqual(['100G', '40G'])
      expect(speedsOf(await ports(request, fx), 'rj45')).toEqual(['40G', '1G'])
    })
  })

  test('[generated] ports generated from a 40G QSFP template show 40G in the side panel', async ({ page, request }) => {
    await withFixture(request, { blocks: BLOCKS('40G'), withSwitch: true }, async (fx) => {
      expect(speedsOf(await ports(request, fx), 'qsfp')).toEqual(['40G', '40G'])
      await openSwitch(page, fx)
      await qsfpPort(page, 1).click()
      await expect(page.getByRole('dialog').getByLabel('Speed', { exact: true })).toHaveText('40G')
    })
  })

  test('[template-create] the create form offers 40G in order and saves a QSFP block with 40G', async ({ page, request }) => {
    await withFixture(request, {}, async (fx) => {
      const name = `tpl-create ${fx.tag}` // unique per run: the ONLY record this test may delete
      const baselineTemplateIds = new Set(listOf(await ok(await request.get('/api/layout-templates')), 'layout-templates').map(t => String(t.id)))
      const findCreated = async () => {
        const hits = listOf(await ok(await request.get('/api/layout-templates')), 'layout-templates').filter(t => t.name === name)
        expect(hits.length, 'at most one template with the unique name').toBeLessThanOrEqual(1)
        return hits[0] ? String(hits[0].id) : null
      }
      try {
        await page.goto('/layout-templates/create')
        await pickSpeed(page, page.getByLabel('Port Type', { exact: true }), 'QSFP')
        const nameInput = page.getByLabel('Name', { exact: true })
        await nameInput.fill(name)
        await page.getByLabel('Port Count', { exact: true }).fill('4')
        const speed = page.getByLabel('Default Speed', { exact: true })
        expectFortyGigOrder(await listSpeeds(page, speed))
        await pickSpeed(page, speed, '40G')
        await expect(nameInput, 'the unique name is retained right before Create').toHaveValue(name)
        await page.getByRole('button', { name: 'Create', exact: true }).click()
        await expect.poll(findCreated).not.toBeNull()
        const id = (await findCreated())!
        const tpl = await ok<{ units: Array<{ blocks: Array<{ type: string, count: number, default_speed?: string }> }> }>(await request.get(`/api/layout-templates/${id}`))
        expect(tpl.units[0]!.blocks[0]).toMatchObject({ type: 'qsfp', count: 4, default_speed: '40G' })
        // Completion: the UI has navigated to this record's detail page and loaded it before fixture cleanup deletes it.
        await expect(page).toHaveURL(new RegExp(`/layout-templates/${id}$`))
        await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
      } finally {
        // Even if the UI/poll failed after the save, register the record by its exact unique name so cleanup deletes + verifies it.
        const id = await findCreated()
        if (id) {
          expect(baselineTemplateIds.has(id), 'never delete a baseline template').toBe(false)
          fx.extraTemplateIds.push(id)
        }
      }
    })
  })

  test('[template-edit] the edit form offers 40G in order and saves it on an existing 100G QSFP block', async ({ page, request }) => {
    await withFixture(request, { blocks: [{ type: 'qsfp', count: 2, start_index: 1, rows: 1, label: 'QSFP', default_speed: '100G' }] }, async (fx) => {
      await page.goto(`/layout-templates/${fx.templateId}/edit`)
      const speed = page.getByLabel('Default Speed', { exact: true })
      await expect(speed).toBeVisible()
      expectFortyGigOrder(await listSpeeds(page, speed))
      await pickSpeed(page, speed, '40G')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect.poll(async () => (await ok<{ units: Array<{ blocks: Array<{ default_speed?: string }> }> }>(await request.get(`/api/layout-templates/${fx.templateId}`))).units[0]!.blocks[0]!.default_speed).toBe('40G')
      // Completion: the UI has navigated to this record's detail page and loaded it before fixture cleanup deletes it.
      await expect(page).toHaveURL(new RegExp(`/layout-templates/${fx.templateId}$`))
      await expect(page.getByRole('heading', { level: 1, name: `tpl ${fx.tag}`, exact: true })).toBeVisible()
    })
  })

  test('[api] the compiled API accepts 40G and still rejects lowercase, unknown speeds and XFP (generic 400, no write on rejection)', async ({ request }) => {
    await withFixture(request, { blocks: BLOCKS('100G'), withSwitch: true }, async (fx) => {
      const q = (await ports(request, fx)).filter(p => p.type === 'qsfp').sort((a, b) => a.index - b.index)
      const tplUrl = `/api/layout-templates/${fx.templateId}`
      const tplBefore = await ok<Record<string, unknown>>(await request.get(tplUrl))
      const portsBefore = await ports(request, fx)
      // Reliable activity evidence: entries filtered by the fixture's own entity ids (template, switch, every port).
      const entityIds = [fx.templateId!, fx.switchId!, ...portsBefore.map(p => p.id)]
      const activityCount = async () => {
        const counts: number[] = []
        for (const id of entityIds) counts.push((await ok<{ total: number }>(await request.get(`/api/activity?entity_id=${id}&limit=1000`))).total)
        return counts
      }
      const activityBefore = await activityCount()

      /** Asserts a GENERIC 400 from the real compiled server: no Zod internals, no echo of the submitted value, no stack frames. */
      async function expectGeneric400(res: import('@playwright/test').APIResponse, label: string, submitted: string) {
        const text = await res.text()
        const status = res.status()
        let parsed: Record<string, unknown> | null
        try { parsed = JSON.parse(text) as Record<string, unknown> } catch { parsed = null }
        const stack = parsed?.stack
        const checks = {
          status400: status === 400,
          jsonBody: parsed !== null && typeof parsed === 'object',
          noZodDetails: !/invalid_enum|invalid_value|ZodError|received|options|"issues"/i.test(text),
          noSubmittedEcho: !text.toLowerCase().includes(submitted.toLowerCase()),
          stackAbsentOrEmpty: stack === undefined || (Array.isArray(stack) && stack.length === 0)
        }
        // Booleans only: a failure never dumps the raw body or stack.
        expect(checks, `${label} generic 400`).toEqual({ status400: true, jsonBody: true, noZodDetails: true, noSubmittedEcho: true, stackAbsentOrEmpty: true })
      }

      for (const bad of ['40g', '100g', '25G']) {
        await expectGeneric400(await request.put(`/api/switches/${fx.switchId}/ports/${q[0]!.id}`, { data: { speed: bad } }), `port ${bad}`, bad)
        await expectGeneric400(await request.put(`/api/switches/${fx.switchId}/ports/bulk`, { data: { port_ids: [q[0]!.id], updates: { speed: bad } } }), `bulk ${bad}`, bad)
      }
      const x = `x-${fx.tag}`
      await expectGeneric400(await request.post('/api/layout-templates', { data: { name: x, units: [{ unit_number: 1, blocks: [{ type: 'xfp', count: 1, start_index: 1, rows: 1 }] }] } }), 'template POST xfp', 'xfp')
      await expectGeneric400(await request.post('/api/layout-templates', { data: { name: x, units: [{ unit_number: 1, blocks: [{ type: 'qsfp', count: 1, start_index: 1, rows: 1, default_speed: '40g' }] }] } }), 'template POST 40g', '40g')
      await expectGeneric400(await request.put(tplUrl, { data: { name: `renamed-${fx.tag}`, units: [{ unit_number: 1, blocks: [{ type: 'qsfp', count: 2, start_index: 1, rows: 1, default_speed: '25G' }] }] } }), 'template PUT 25G', '25G')

      expect(speedsOf(await ports(request, fx), 'qsfp'), 'rejected requests changed nothing').toEqual(['100G', '100G'])
      expect(await ports(request, fx), 'every port unchanged after rejections').toEqual(portsBefore)
      expect(await ok<Record<string, unknown>>(await request.get(tplUrl)), 'template unchanged after rejected PUT').toEqual(tplBefore)
      expect(listOf(await ok(await request.get('/api/layout-templates')), 'layout-templates').filter(t => t.name === x).length, 'no template created by rejected POSTs').toBe(0)
      expect(await activityCount(), 'no activity for fixture entities after rejections').toEqual(activityBefore)

      expect((await request.put(`/api/switches/${fx.switchId}/ports/${q[0]!.id}`, { data: { speed: '40G' } })).ok()).toBe(true)
      expect(speedsOf(await ports(request, fx), 'qsfp')).toEqual(['40G', '100G'])
    })
  })
})
