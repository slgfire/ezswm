import { test, expect } from '@playwright/test'

test.describe('VLAN CRUD', () => {
  test('create VLAN', async ({ page }) => {
    await page.goto('/vlans/create')
    await page.waitForTimeout(1000)

    // VLAN ID - number input
    await page.locator('main input[type="number"]').fill('100')
    // Name - find by placeholder
    await page.locator('main input[placeholder="Name"], main input[placeholder*="ame"]').first().fill('Server-VLAN')

    await page.locator('main button[type="submit"], main form button').filter({ hasText: /save|speichern/i }).click()

    await page.waitForURL(/\/vlans\/\w/, { timeout: 10000 })
    await expect(page.locator('main')).toContainText('Server-VLAN')
  })

  test('VLAN appears in list', async ({ page }) => {
    await page.goto('/vlans')
    await page.waitForTimeout(2000)
    await expect(page.locator('main')).toContainText('Server-VLAN', { timeout: 5000 })
  })
})
