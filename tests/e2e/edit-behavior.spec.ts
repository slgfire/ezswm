import { test, expect } from '@playwright/test'

interface ApiItem {
  id: string
  name: string
  [key: string]: unknown
}

/**
 * Tests that editing objects uses inline edit on the same page (no new window/tab/page).
 * Tests save/cancel behavior and data persistence after save.
 */

test.describe('Edit Behavior — Inline Edit', () => {

  // ─── Networks ──────────────────────────────────────────────────

  test.describe.serial('Network edit', () => {
    test('create a test network via API', async ({ context }) => {
      const res = await context.request.post('http://localhost:3000/api/networks', {
        data: { name: 'EditTest-Net', subnet: '10.99.0.0/24', gateway: '10.99.0.1' }
      })
      expect(res.status()).toBe(201)
      await res.json()
    })

    test('edit button reveals inline form, does NOT open new page', async ({ page, context }) => {
      // Fetch the network we created
      const list = await context.request.get('http://localhost:3000/api/networks')
      const networks = await list.json()
      const net = (networks.data || networks).find((n: ApiItem) => n.name === 'EditTest-Net')
      expect(net).toBeTruthy()

      await page.goto(`/networks/${net.id}`)
      await page.waitForLoadState('networkidle')

      // Capture current URL
      const urlBefore = page.url()

      // Listen for new pages (popups/tabs)
      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      // Click edit
      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await page.waitForTimeout(500)

      // No new tab opened
      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)

      // URL should not have changed (inline edit)
      expect(page.url()).toBe(urlBefore)

      // Edit form should be visible on the same page
      await expect(page.locator('form')).toBeVisible()
    })

    test('cancel edit hides form without saving', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/networks')
      const networks = await list.json()
      const net = (networks.data || networks).find((n: ApiItem) => n.name === 'EditTest-Net')

      await page.goto(`/networks/${net.id}`)
      await page.waitForLoadState('networkidle')

      // Start editing
      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await expect(page.locator('form')).toBeVisible()

      // Click cancel
      await page.getByRole('button', { name: /cancel|abbrechen/i }).click()
      await page.waitForTimeout(300)

      // Form should be gone, read-only view back
      await expect(page.locator('form')).not.toBeVisible()
      await expect(page.locator('main')).toContainText('EditTest-Net')
    })

    test('save edit persists changes', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/networks')
      const networks = await list.json()
      const net = (networks.data || networks).find((n: ApiItem) => n.name === 'EditTest-Net')

      await page.goto(`/networks/${net.id}`)
      await page.waitForLoadState('networkidle')

      // Start editing
      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await expect(page.locator('form')).toBeVisible()

      // Change name
      const nameInput = page.locator('form input').first()
      await nameInput.fill('EditTest-Net-Updated')

      // Save
      await page.locator('form').getByRole('button', { name: /save|speichern/i }).click()
      await page.waitForTimeout(1000)

      // Form should close
      await expect(page.locator('form')).not.toBeVisible({ timeout: 5000 })

      // Updated name should be displayed
      await expect(page.locator('main')).toContainText('EditTest-Net-Updated')
    })

    test('changes persist after page reload', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/networks')
      const networks = await list.json()
      const net = (networks.data || networks).find((n: ApiItem) => n.name === 'EditTest-Net-Updated')
      expect(net).toBeTruthy()

      await page.goto(`/networks/${net.id}`)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('main')).toContainText('EditTest-Net-Updated')
    })

    test('cleanup: delete test network', async ({ context }) => {
      const list = await context.request.get('http://localhost:3000/api/networks')
      const networks = await list.json()
      const net = (networks.data || networks).find((n: ApiItem) => n.name.startsWith('EditTest-Net'))
      if (net) {
        await context.request.delete(`http://localhost:3000/api/networks/${net.id}`)
      }
    })
  })

  // ─── VLANs ─────────────────────────────────────────────────────

  test.describe.serial('VLAN edit', () => {
    test('create test VLAN via API', async ({ context }) => {
      const res = await context.request.post('http://localhost:3000/api/vlans', {
        data: { vlan_id: 999, name: 'EditTest-VLAN', color: '#FF0000' }
      })
      expect(res.status()).toBe(201)
    })

    test('edit button reveals inline form, does NOT open new page', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/vlans')
      const vlans = await list.json()
      const vlan = (vlans.data || vlans).find((v: ApiItem) => v.name === 'EditTest-VLAN')
      expect(vlan).toBeTruthy()

      await page.goto(`/vlans/${vlan.id}`)
      await page.waitForLoadState('networkidle')

      const urlBefore = page.url()

      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await page.waitForTimeout(500)

      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)
      expect(page.url()).toBe(urlBefore)
      await expect(page.locator('form')).toBeVisible()
    })

    test('save edit updates VLAN name', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/vlans')
      const vlans = await list.json()
      const vlan = (vlans.data || vlans).find((v: ApiItem) => v.name === 'EditTest-VLAN')

      await page.goto(`/vlans/${vlan.id}`)
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()

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
      const list = await context.request.get('http://localhost:3000/api/vlans')
      const vlans = await list.json()
      const vlan = (vlans.data || vlans).find((v: ApiItem) => v.name.startsWith('EditTest-VLAN'))
      if (vlan) {
        await context.request.delete(`http://localhost:3000/api/vlans/${vlan.id}`)
      }
    })
  })

  // ─── Switches ──────────────────────────────────────────────────

  test.describe.serial('Switch edit', () => {
    test('create test switch via API', async ({ context }) => {
      // Cleanup any leftover from previous run
      const existing = await context.request.get('http://localhost:3000/api/switches')
      const existingData = await existing.json()
      const items = existingData.data || existingData
      if (Array.isArray(items)) {
        for (const s of items) {
          if (s.name.startsWith('EditTest-Switch')) {
            await context.request.delete(`http://localhost:3000/api/switches/${s.id}`)
          }
        }
      }

      const res = await context.request.post('http://localhost:3000/api/switches', {
        data: { name: 'EditTest-Switch', model: 'Test-2960', manufacturer: 'Cisco' }
      })
      expect(res.status()).toBe(201)
    })

    test('edit button reveals inline form on same page', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/switches')
      const switches = await list.json()
      const sw = (switches.data || switches).find((s: ApiItem) => s.name === 'EditTest-Switch')
      expect(sw).toBeTruthy()

      await page.goto(`/switches/${sw.id}`)
      await page.waitForLoadState('networkidle')

      const urlBefore = page.url()

      const newPagePromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 2000)
        context.on('page', () => { clearTimeout(timeout); resolve(true) })
      })

      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await page.waitForTimeout(500)

      const newPageOpened = await newPagePromise
      expect(newPageOpened).toBe(false)
      expect(page.url()).toBe(urlBefore)

      // Edit form visible
      await expect(page.locator('form')).toBeVisible()
    })

    test('save switch edit persists name change', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/switches')
      const switches = await list.json()
      const sw = (switches.data || switches).find((s: ApiItem) => s.name === 'EditTest-Switch')

      await page.goto(`/switches/${sw.id}`)
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()
      await expect(page.locator('form')).toBeVisible()

      // The first input in the form is the name field (required, marked with *)
      const nameInput = page.locator('form input').first()
      await nameInput.fill('EditTest-Switch-Updated')

      // Click the save button inside the form
      await page.locator('form').getByRole('button', { name: /save|speichern/i }).click()

      // Wait for form to close (edit mode off)
      await expect(page.locator('form')).not.toBeVisible({ timeout: 10000 })

      // Updated name should appear in the read-only view
      await expect(page.locator('main')).toContainText('EditTest-Switch-Updated')
    })

    test('cancel switch edit reverts changes', async ({ page, context }) => {
      const list = await context.request.get('http://localhost:3000/api/switches')
      const switches = await list.json()
      const allSwitches = switches.data || switches
      const sw = allSwitches.find((s: ApiItem) => s.name === 'EditTest-Switch-Updated') || allSwitches.find((s: ApiItem) => s.name === 'EditTest-Switch')

      await page.goto(`/switches/${sw.id}`)
      await page.waitForLoadState('networkidle')

      await page.getByRole('button', { name: /edit|bearbeiten/i }).first().click()

      // Change name
      const nameInput = page.locator('form input').first()
      await nameInput.fill('ShouldNotBeSaved')

      // Cancel — use the form cancel button (not the header edit/cancel toggle)
      await page.locator('form').getByRole('button', { name: /cancel|abbrechen/i }).click()
      await page.waitForTimeout(300)

      // Original name should be shown (either -Updated or original, depending on prior test)
      await expect(page.locator('main')).toContainText('EditTest-Switch')
      await expect(page.locator('main')).not.toContainText('ShouldNotBeSaved')
    })

    test('cleanup: delete test switch', async ({ context }) => {
      const list = await context.request.get('http://localhost:3000/api/switches')
      const switches = await list.json()
      const allSwitches = switches.data || switches
      for (const sw of allSwitches) {
        if (sw.name.startsWith('EditTest-Switch')) {
          await context.request.delete(`http://localhost:3000/api/switches/${sw.id}`)
        }
      }
    })
  })

  // ─── Layout Templates — known issue: navigates to edit page ───

  test.describe.serial('Layout Template edit behavior', () => {
    test('create test template via API', async ({ context }) => {
      // Cleanup any leftover from previous run
      const existing = await context.request.get('http://localhost:3000/api/layout-templates')
      const existingData = await existing.json()
      const items = existingData.items || existingData.data || existingData
      if (Array.isArray(items)) {
        for (const t of items) {
          if (t.name.startsWith('EditTest-Template')) {
            await context.request.delete(`http://localhost:3000/api/layout-templates/${t.id}`)
          }
        }
      }

      const res = await context.request.post('http://localhost:3000/api/layout-templates', {
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
      const list = await context.request.get('http://localhost:3000/api/layout-templates')
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
      const list = await context.request.get('http://localhost:3000/api/layout-templates')
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
      const list = await context.request.get('http://localhost:3000/api/layout-templates')
      const templates = await list.json()
      const tpl = (templates.items || templates.data || templates).find((t: ApiItem) => t.name.startsWith('EditTest-Template'))
      if (tpl) {
        await context.request.delete(`http://localhost:3000/api/layout-templates/${tpl.id}`)
      }
    })
  })
})
