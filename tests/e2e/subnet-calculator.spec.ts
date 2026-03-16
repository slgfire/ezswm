import { test, expect } from '@playwright/test'

test.describe('Subnet Calculator', () => {
  test('calculates subnet info', async ({ page }) => {
    await page.goto('/tools/subnet-calculator')
    await page.waitForTimeout(1000)

    const input = page.locator('main input').first()
    await input.fill('192.168.1.0/24')
    // Trigger input event since fill() doesn't fire Vue's @input
    await input.dispatchEvent('input')

    await expect(page.locator('main')).toContainText('255.255.255.0', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('254')
  })
})
