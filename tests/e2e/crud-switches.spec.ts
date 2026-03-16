import { test, expect } from '@playwright/test'

test.describe.serial('Switch CRUD', () => {
  test('create switch', async ({ page }) => {
    await page.goto('/switches/create')
    await page.waitForTimeout(500)

    // Fill form by finding inputs in order
    const textInputs = page.locator('.space-y-4 input[type="text"], .space-y-4 input:not([type])')

    await textInputs.nth(0).fill('Core-Switch-01')   // name
    await textInputs.nth(1).fill('2960-24T')          // model
    await textInputs.nth(2).fill('Cisco')             // manufacturer
    await textInputs.nth(4).fill('Hall A')            // location
    await textInputs.nth(6).fill('10.0.0.1')          // management_ip

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
