import { test, expect } from '@playwright/test'

test.describe('Network CRUD', () => {
  test('create network', async ({ page, context }) => {
    // Cleanup any leftover
    const existing = await context.request.get('http://localhost:3000/api/networks')
    const existingData = await existing.json()
    const items = existingData.data || existingData
    if (Array.isArray(items)) {
      for (const n of items) {
        if (n.name === 'Server-Net') {
          await context.request.delete(`http://localhost:3000/api/networks/${n.id}`)
        }
      }
    }

    await page.goto('/networks/create')
    await page.waitForLoadState('networkidle')

    // Fill form fields by finding inputs inside the form
    const form = page.locator('main form, main .max-w-2xl')
    const inputs = form.locator('input[type="text"], input:not([type])')
    await inputs.nth(0).fill('Server-Net')      // name
    await inputs.nth(1).fill('10.0.1.0/24')     // subnet
    await inputs.nth(2).fill('10.0.1.1')        // gateway

    await page.getByRole('button', { name: /save|speichern/i }).click()
    await page.waitForURL(/\/networks\/\w/, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Server-Net')
  })

  test('network appears in list', async ({ page }) => {
    await page.goto('/networks')
    await page.waitForTimeout(2000)
    await expect(page.locator('main')).toContainText('Server-Net', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('10.0.1.0/24')
  })
})
