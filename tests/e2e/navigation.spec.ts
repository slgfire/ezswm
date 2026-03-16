import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('sidebar links work', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    // Switches
    await page.locator('aside a[href="/switches"]').click()
    await page.waitForURL('/switches')
    await expect(page.locator('h1')).toContainText('Switches')

    // VLANs
    await page.locator('aside a[href="/vlans"]').click()
    await page.waitForURL('/vlans')
    await expect(page.locator('h1')).toContainText('VLAN')

    // Networks
    await page.locator('aside a[href="/networks"]').click()
    await page.waitForURL('/networks')
    await expect(page.locator('h1')).toContainText(/Network|Netzwerk/)

    // Settings
    await page.locator('aside a[href="/settings"]').click()
    await page.waitForURL('/settings')
    await expect(page.locator('h1')).toContainText(/Settings|Einstellungen/)
  })
})
