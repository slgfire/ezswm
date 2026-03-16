import { test, expect } from '@playwright/test'

test.describe('Network CRUD', () => {
  test('create network', async ({ page }) => {
    await page.goto('/networks/create')
    await page.waitForTimeout(1000)

    // Target inputs inside main content area (not header search)
    const form = page.locator('main form, main .max-w-2xl')
    await form.locator('input').nth(0).fill('Server-Net')
    await form.locator('input').nth(1).fill('10.0.1.0/24')
    await form.locator('input').nth(2).fill('10.0.1.1')

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
