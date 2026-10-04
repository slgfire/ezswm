import { test, expect, type APIRequestContext } from '@playwright/test'

interface ApiItem {
  id: string
  name: string
  [key: string]: unknown
}
interface SiteRow { id: string, route: string }

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
async function siteRows(request: APIRequestContext, kind: 'networks' | 'vlans' | 'switches', siteId: string): Promise<ApiItem[]> {
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
  return body.data as ApiItem[]
}

/**
 * Tests that editing objects stays on the same page (no new window/tab/page).
 * Tests save/cancel behavior and data persistence after save.
 * Current UI: VLAN detail edits inline; Subnet and Switch detail edit in a slideover (dialog whose
 * Save/Cancel sit in its footer). The goals (no new tab, URL unchanged, cancel discards, save persists) are unchanged.
 */

test.describe('Edit Behavior — Inline Edit', () => {

  // ─── Networks ──────────────────────────────────────────────────

  test.describe.serial('Network edit', () => {
    test('create a test network via API', async ({ context }) => {
      const site = await e2eSite(context.request)
      // Cleanup any leftover (name-targeted, inside the E2E site only)
      for (const n of await siteRows(context.request, 'networks', site.id)) {
        if (n.name.startsWith('EditTest-Net')) await context.request.delete(`/api/networks/${n.id}`)
      }
      const res = await context.request.post('/api/networks', {
        data: { site_id: site.id, name: 'EditTest-Net', subnet: '10.99.0.0/24', gateway: '10.99.0.1' }
      })
      expect(res.status()).toBe(201)
      await res.json()
    })

    test('edit button reveals inline form, does NOT open new page', async ({ page, context }) => {
      // Fetch the network we created
      const site = await e2eSite(context.request)
      const net = (await siteRows(context.request, 'networks', site.id)).find((n: ApiItem) => n.name === 'EditTest-Net')
      expect(net).toBeTruthy()

      await page.goto(`/sites/${site.route}/subnets/${(net!.slug as string | undefined) || net!.id}`)
      await page.waitForLoadState('networkidle')

      // Capture current URL
      const urlBefore = page.url()

      // Listen for new pages (popups/tabs)
      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      // Click edit (the pencil button of the page header, exact name)
      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await page.waitForTimeout(500)

      // No new tab opened
      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)

      // URL should not have changed (edit happens on the same page)
      expect(page.url()).toBe(urlBefore)

      // Edit form should be visible on the same page (in the edit dialog)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('form')).toBeVisible()
    })

    test('cancel edit hides form without saving', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const net = (await siteRows(context.request, 'networks', site.id)).find((n: ApiItem) => n.name === 'EditTest-Net')
      expect(net).toBeTruthy()

      await page.goto(`/sites/${site.route}/subnets/${(net!.slug as string | undefined) || net!.id}`)
      await page.waitForLoadState('networkidle')

      // Start editing
      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('form')).toBeVisible()

      // Click cancel (footer of the edit dialog; nothing was typed, so no discard prompt)
      await page.getByRole('dialog').getByRole('button', { name: /cancel|abbrechen/i }).click()
      await page.waitForTimeout(300)

      // Form should be gone, read-only view back
      await expect(page.getByRole('dialog').locator('form')).not.toBeVisible()
      await expect(page.locator('main')).toContainText('EditTest-Net')
    })

    test('save edit persists changes', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const net = (await siteRows(context.request, 'networks', site.id)).find((n: ApiItem) => n.name === 'EditTest-Net')
      expect(net).toBeTruthy()

      await page.goto(`/sites/${site.route}/subnets/${(net!.slug as string | undefined) || net!.id}`)
      await page.waitForLoadState('networkidle')

      // Start editing
      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('form')).toBeVisible()

      // Change name
      const nameInput = page.getByRole('dialog').locator('form input').first()
      await nameInput.fill('EditTest-Net-Updated')

      // Save (footer of the edit dialog)
      await page.getByRole('dialog').getByRole('button', { name: /save|speichern/i }).click()
      await page.waitForTimeout(1000)

      // Form should close
      await expect(page.getByRole('dialog').locator('form')).not.toBeVisible({ timeout: 5000 })

      // Updated name should be displayed
      await expect(page.locator('main')).toContainText('EditTest-Net-Updated')
    })

    test('changes persist after page reload', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const net = (await siteRows(context.request, 'networks', site.id)).find((n: ApiItem) => n.name === 'EditTest-Net-Updated')
      expect(net).toBeTruthy()

      await page.goto(`/sites/${site.route}/subnets/${(net!.slug as string | undefined) || net!.id}`)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('main')).toContainText('EditTest-Net-Updated')
    })

    test('cleanup: delete test network', async ({ context }) => {
      const site = await e2eSite(context.request)
      const net = (await siteRows(context.request, 'networks', site.id)).find((n: ApiItem) => n.name.startsWith('EditTest-Net'))
      if (net) {
        await context.request.delete(`/api/networks/${net.id}`)
      }
    })
  })

  // ─── VLANs ─────────────────────────────────────────────────────

  test.describe.serial('VLAN edit', () => {
    test('create test VLAN via API', async ({ context }) => {
      const site = await e2eSite(context.request)
      // Cleanup any leftover (name-targeted, inside the E2E site only)
      for (const v of await siteRows(context.request, 'vlans', site.id)) {
        if (v.name.startsWith('EditTest-VLAN')) await context.request.delete(`/api/vlans/${v.id}`)
      }
      const res = await context.request.post('/api/vlans', {
        data: { site_id: site.id, vlan_id: 999, name: 'EditTest-VLAN', color: '#FF0000' }
      })
      expect(res.status()).toBe(201)
    })

    test('edit button reveals inline form, does NOT open new page', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const vlan = (await siteRows(context.request, 'vlans', site.id)).find((v: ApiItem) => v.name === 'EditTest-VLAN')
      expect(vlan).toBeTruthy()

      await page.goto(`/sites/${site.route}/vlans/${vlan!.id}`)
      await page.waitForLoadState('networkidle')

      const urlBefore = page.url()

      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await page.waitForTimeout(500)

      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)
      expect(page.url()).toBe(urlBefore)
      await expect(page.locator('form')).toBeVisible()
    })

    test('save edit updates VLAN name', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const vlan = (await siteRows(context.request, 'vlans', site.id)).find((v: ApiItem) => v.name === 'EditTest-VLAN')
      expect(vlan).toBeTruthy()

      await page.goto(`/sites/${site.route}/vlans/${vlan!.id}`)
      await page.waitForLoadState('networkidle')

      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()

      // The name input for VLAN (second field in edit, after vlan_id)
      // Find the input that contains the VLAN name
      const allInputs = page.locator('form input')
      const count = await allInputs.count()
      for (let i = 0; i < count; i++) {
        const val = await allInputs.nth(i).inputValue()
        if (val === 'EditTest-VLAN') {
          await allInputs.nth(i).fill('EditTest-VLAN-Updated')
          break
        }
      }

      await page.locator('form').getByRole('button', { name: /save|speichern/i }).click()
      await page.waitForTimeout(1000)

      await expect(page.locator('main')).toContainText('EditTest-VLAN-Updated', { timeout: 5000 })
    })

    test('cleanup: delete test VLAN', async ({ context }) => {
      const site = await e2eSite(context.request)
      const vlan = (await siteRows(context.request, 'vlans', site.id)).find((v: ApiItem) => v.name.startsWith('EditTest-VLAN'))
      if (vlan) {
        await context.request.delete(`/api/vlans/${vlan.id}`)
      }
    })
  })

  // ─── Switches ──────────────────────────────────────────────────

  test.describe.serial('Switch edit', () => {
    test('create test switch via API', async ({ context }) => {
      const site = await e2eSite(context.request)
      // Cleanup any leftover from previous run (name-targeted, inside the E2E site only)
      for (const s of await siteRows(context.request, 'switches', site.id)) {
        if (s.name.startsWith('EditTest-Switch')) {
          await context.request.delete(`/api/switches/${s.id}`)
        }
      }

      const res = await context.request.post('/api/switches', {
        data: { site_id: site.id, name: 'EditTest-Switch', model: 'Test-2960', manufacturer: 'Cisco' }
      })
      expect(res.status()).toBe(201)
    })

    test('edit button reveals inline form on same page', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const sw = (await siteRows(context.request, 'switches', site.id)).find((s: ApiItem) => s.name === 'EditTest-Switch')
      expect(sw).toBeTruthy()

      await page.goto(`/sites/${site.route}/switches/${(sw!.slug as string | undefined) || sw!.id}`)
      await page.waitForLoadState('networkidle')

      const urlBefore = page.url()

      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await page.waitForTimeout(500)

      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)
      expect(page.url()).toBe(urlBefore)

      // Edit form visible (in the edit dialog)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('form')).toBeVisible()
    })

    test('save switch edit persists name change', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const sw = (await siteRows(context.request, 'switches', site.id)).find((s: ApiItem) => s.name === 'EditTest-Switch')
      expect(sw).toBeTruthy()

      await page.goto(`/sites/${site.route}/switches/${(sw!.slug as string | undefined) || sw!.id}`)
      await page.waitForLoadState('networkidle')

      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('dialog').locator('form')).toBeVisible()

      // The first input in the form is the name field (required, marked with *)
      const nameInput = page.getByRole('dialog').locator('form input').first()
      await nameInput.fill('EditTest-Switch-Updated')

      // Click the save button of the edit dialog (it sits in the dialog footer, outside the form)
      await page.getByRole('dialog').getByRole('button', { name: /save|speichern/i }).click()

      // Wait for form to close (edit mode off)
      await expect(page.getByRole('dialog').locator('form')).not.toBeVisible({ timeout: 10000 })

      // Updated name should appear in the read-only view
      await expect(page.locator('main')).toContainText('EditTest-Switch-Updated')
    })

    test('cancel switch edit reverts changes', async ({ page, context }) => {
      const site = await e2eSite(context.request)
      const allSwitches = await siteRows(context.request, 'switches', site.id)
      const sw = allSwitches.find((s: ApiItem) => s.name === 'EditTest-Switch-Updated') || allSwitches.find((s: ApiItem) => s.name === 'EditTest-Switch')
      expect(sw).toBeTruthy()

      await page.goto(`/sites/${site.route}/switches/${(sw!.slug as string | undefined) || sw!.id}`)
      await page.waitForLoadState('networkidle')

      await page.locator('main').getByRole('button', { name: /^(Edit|Bearbeiten)$/ }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Change name
      const nameInput = page.getByRole('dialog').locator('form input').first()
      await nameInput.fill('ShouldNotBeSaved')

      // Cancel — the dialog's Cancel button; the dirty form asks before discarding, and the discard is confirmed
      await page.getByRole('dialog').getByRole('button', { name: /cancel|abbrechen/i }).click()
      await page.getByRole('button', { name: /^(Leave|Verlassen)$/ }).click()
      await page.waitForTimeout(300)

      // Original name should be shown (either -Updated or original, depending on prior test)
      await expect(page.locator('main')).toContainText('EditTest-Switch')
      await expect(page.locator('main')).not.toContainText('ShouldNotBeSaved')
    })

    test('renaming a site-scoped switch updates browser URL to new slug', async ({ page, context }) => {
      const renameSuffix = `${Date.now()}`
      let renameSiteId = ''
      let renameSwitchId = ''

      try {
        const createSiteRes = await context.request.post('/api/sites', {
          data: { name: `EditTest Rename Site ${renameSuffix}` }
        })
        expect(createSiteRes.status()).toBe(201)
        const siteBody = await createSiteRes.json()
        const site = (siteBody.data || siteBody) as { id: string; slug?: string }
        renameSiteId = site.id as string
        const renameSiteRouteId = (site.slug || site.id) as string

        const createSwitchRes = await context.request.post('/api/switches', {
          data: {
            site_id: renameSiteId,
            name: `EditTest-Rename-${renameSuffix}-A`,
            model: 'Rename-Test'
          }
        })
        expect(createSwitchRes.status()).toBe(201)
        const switchBody = await createSwitchRes.json()
        const createdSwitch = (switchBody.data || switchBody) as { id: string; slug?: string }
        renameSwitchId = createdSwitch.id as string
        const renameSwitchSlug = (createdSwitch.slug || createdSwitch.id) as string

        await page.goto(`/sites/${renameSiteRouteId}/switches/${renameSwitchSlug}`)
        await page.waitForLoadState('networkidle')

        await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
        await expect(page.locator('form')).toBeVisible()

        const updateResponsePromise = page.waitForResponse((response) => {
          return response.request().method() === 'PUT'
            && response.url().includes('/api/switches/')
            && response.status() === 200
        })

        await page.locator('form input').first().fill(`EditTest-Rename-${renameSuffix}-B`)
        await page.getByRole('button', { name: /save|speichern/i }).last().click()

        const updateResponse = await updateResponsePromise
        const updatedSwitch = await updateResponse.json()
        const updatedSlug = (updatedSwitch.slug || updatedSwitch?.data?.slug) as string
        expect(updatedSlug).toBeTruthy()

        await expect(page).toHaveURL(new RegExp(`/sites/${renameSiteRouteId}/switches/${updatedSlug}$`))
      } finally {
        if (renameSwitchId) {
          await context.request.delete(`/api/switches/${renameSwitchId}`, { timeout: 5000 }).catch(() => {})
        }
        if (renameSiteId) {
          await context.request.delete(`/api/sites/${renameSiteId}`, { timeout: 5000 }).catch(() => {})
        }
      }
    })

    test('cleanup: delete test switch', async ({ context }) => {
      const site = await e2eSite(context.request)
      for (const sw of await siteRows(context.request, 'switches', site.id)) {
        if (sw.name.startsWith('EditTest-Switch')) {
          await context.request.delete(`/api/switches/${sw.id}`)
        }
      }
    })
  })

  // ─── Layout Templates — known issue: navigates to edit page ───

  test.describe.serial('Layout Template edit behavior', () => {
    test('create test template via API', async ({ context }) => {
      // Cleanup any leftover from previous run
      const existing = await context.request.get('/api/layout-templates')
      const existingData = await existing.json()
      const items = existingData.items || existingData.data || existingData
      if (Array.isArray(items)) {
        for (const t of items) {
          if (t.name.startsWith('EditTest-Template')) {
            await context.request.delete(`/api/layout-templates/${t.id}`)
          }
        }
      }

      const res = await context.request.post('/api/layout-templates', {
        data: {
          name: 'EditTest-Template',
          manufacturer: 'Test',
          model: 'T-100',
          units: [{ unit_number: 1, label: 'U1', blocks: [{ type: 'rj45', count: 8, start_index: 1, rows: 1, label: 'Gi' }] }]
        }
      })
      expect(res.status()).toBe(201)
    })

    test('edit button navigates to /edit subpage (documents current behavior)', async ({ page, context }) => {
      const list = await context.request.get('/api/layout-templates')
      const templates = await list.json()
      const tpl = (templates.items || templates.data || templates).find((t: ApiItem) => t.name === 'EditTest-Template')
      expect(tpl).toBeTruthy()

      await page.goto(`/layout-templates/${tpl.id}`)
      await page.waitForLoadState('networkidle')

      // Click edit — this navigates to a separate edit page
      await page.getByRole('link', { name: /edit|bearbeiten/i }).first().click()
      await page.waitForURL(`/layout-templates/${tpl.id}/edit`, { timeout: 5000 })

      // Still same tab, just a different route — this is acceptable behavior
      // for complex forms (template units + blocks)
      await expect(page.locator('form')).toBeVisible()
    })

    test('save template edit persists changes', async ({ page, context }) => {
      const list = await context.request.get('/api/layout-templates')
      const templates = await list.json()
      const tpl = (templates.items || templates.data || templates).find((t: ApiItem) => t.name === 'EditTest-Template')

      await page.goto(`/layout-templates/${tpl.id}/edit`)
      await page.waitForLoadState('networkidle')

      // Change name
      const nameInput = page.locator('form input').first()
      await nameInput.fill('EditTest-Template-Updated')

      await page.getByRole('button', { name: /save|speichern/i }).click()
      await page.waitForURL(`/layout-templates/${tpl.id}`, { timeout: 10000 })

      // Should show updated name
      await expect(page.locator('main')).toContainText('EditTest-Template-Updated')
    })

    test('cleanup: delete test template', async ({ context }) => {
      const list = await context.request.get('/api/layout-templates')
      const templates = await list.json()
      const tpl = (templates.items || templates.data || templates).find((t: ApiItem) => t.name.startsWith('EditTest-Template'))
      if (tpl) {
        await context.request.delete(`/api/layout-templates/${tpl.id}`)
      }
    })
  })
})
