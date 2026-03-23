import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test('settings page loads with tabs', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForTimeout(1000)
    await expect(page.locator('h1')).toContainText(/Settings|Einstellungen/)
    await expect(page.locator('body')).toContainText(/General|Allgemein/)
    await expect(page.locator('body')).toContainText(/Account|Konto/)
  })
})
