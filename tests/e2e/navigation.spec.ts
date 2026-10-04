import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('dashboard loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('sidebar links work', async ({ page }) => {
    await page.goto('/')
    // The root page redirects (client side) to the dashboard of the current site
    await page.waitForURL(/^[^?#]*\/sites\/[^/]+$/)
    await page.waitForLoadState('networkidle')

    // Switches
    await page.locator('nav a[href$="/switches"]').click()
    await page.waitForURL(/\/sites\/[^/]+\/switches$/)
    await expect(page.locator('h1')).toContainText('Switches')

    // VLANs
    await page.locator('nav a[href$="/vlans"]').click()
    await page.waitForURL(/\/sites\/[^/]+\/vlans$/)
    await expect(page.locator('h1')).toContainText('VLAN')

    // Subnets (formerly "Networks")
    await page.locator('nav a[href$="/subnets"]').click()
    await page.waitForURL(/\/sites\/[^/]+\/subnets$/)
    await expect(page.locator('h1')).toContainText(/Subnets|Subnetze/)

    // Settings
    await page.locator('nav a[href="/settings"]').click()
    await page.waitForURL('/settings')
    await expect(page.locator('h1')).toContainText(/Settings|Einstellungen/)
  })
})
