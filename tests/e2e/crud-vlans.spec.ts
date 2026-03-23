import { test, expect } from '@playwright/test'

test.describe('VLAN CRUD', () => {
  test('create VLAN', async ({ page, context }) => {
    // Cleanup any leftover
    const existing = await context.request.get('http://localhost:3000/api/vlans')
    const existingData = await existing.json()
    const items = existingData.data || existingData
    if (Array.isArray(items)) {
      for (const v of items) {
        if (v.name === 'Server-VLAN') {
          await context.request.delete(`http://localhost:3000/api/vlans/${v.id}`)
        }
      }
    }

    await page.goto('/vlans/create')
    await page.waitForLoadState('networkidle')

    // VLAN ID — number input
    await page.locator('main input[type="number"]').fill('100')
    // Name — find by the text input that's NOT the color picker
    const textInputs = page.locator('main .space-y-4 input[type="text"], main .space-y-4 input:not([type]):not([type="number"]):not([type="color"])')
    // First text input is the Name field
    await textInputs.first().fill('Server-VLAN')

    // Submit
    await page.getByRole('button', { name: /save|speichern/i }).click()
    await page.waitForURL(/\/vlans\/\w/, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Server-VLAN')
  })

  test('VLAN appears in list', async ({ page }) => {
    await page.goto('/vlans')
    await page.waitForTimeout(2000)
    await expect(page.locator('main')).toContainText('Server-VLAN', { timeout: 5000 })
  })
})
