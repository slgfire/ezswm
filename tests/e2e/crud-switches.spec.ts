import { test, expect } from '@playwright/test'

test.describe.serial('Switch CRUD', () => {
  test('create switch', async ({ page, context }) => {
    // Cleanup any leftover
    const existing = await context.request.get('http://localhost:3000/api/switches')
    const existingData = await existing.json()
    const items = existingData.data || existingData
    if (Array.isArray(items)) {
      for (const s of items) {
        if (s.name === 'Core-Switch-01') {
          await context.request.delete(`http://localhost:3000/api/switches/${s.id}`)
        }
      }
    }

    await page.goto('/switches/create')
    await page.waitForLoadState('networkidle')

    // Fill form — find text inputs in the form's space-y-4 container
    const form = page.locator('main form, main .max-w-2xl')
    const inputs = form.locator('input[type="text"], input:not([type])')

    await inputs.nth(0).fill('Core-Switch-01')   // name
    await inputs.nth(1).fill('2960-24T')          // model
    await inputs.nth(2).fill('Cisco')             // manufacturer
    // nth(3) = serial number (skip)
    await inputs.nth(4).fill('Hall A')            // location
    // nth(5) = rack_position (skip)
    await inputs.nth(6).fill('10.0.0.1')          // management_ip

    await page.getByRole('button', { name: /save|speichern/i }).click()

    // Should navigate to detail page
    await page.waitForURL(/\/switches\/\w/, { timeout: 10000 })
    await expect(page.locator('body')).toContainText('Core-Switch-01')
  })

  test('switch appears in list', async ({ page }) => {
    await page.goto('/switches')
    await page.waitForTimeout(1000)
    await expect(page.locator('body')).toContainText('Core-Switch-01', { timeout: 5000 })
  })

  test('switch detail shows info', async ({ page }) => {
    await page.goto('/switches')
    await page.waitForTimeout(1000)
    await page.getByText('Core-Switch-01').first().click()
    await page.waitForURL(/\/switches\/\w/)
    await expect(page.locator('body')).toContainText('Cisco')
    await expect(page.locator('body')).toContainText('Hall A')
  })
})
