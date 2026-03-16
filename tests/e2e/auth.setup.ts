import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = './tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  const url = page.url()
  console.log('Initial URL:', url)

  if (url.includes('/setup')) {
    console.log('Performing first-time setup...')
    // Fill setup form - find inputs by placeholder or position
    const inputs = page.locator('input[type="text"], input:not([type])')
    const passwordInputs = page.locator('input[type="password"]')

    await inputs.nth(0).fill('admin')        // username
    await inputs.nth(1).fill('Test Admin')   // display_name
    await passwordInputs.nth(0).fill('password123')  // password
    await passwordInputs.nth(1).fill('password123')  // confirm password

    await page.getByRole('button', { name: /setup|complete|einrichtung/i }).click()
    await page.waitForURL('/', { timeout: 15000 })
  } else if (url.includes('/login')) {
    console.log('Performing login...')
    const inputs = page.locator('input[type="text"], input:not([type])')
    const passwordInput = page.locator('input[type="password"]')

    await inputs.first().fill('admin')
    await passwordInput.fill('password123')
    await page.getByRole('button', { name: /login|sign|anmelden/i }).click()
    await page.waitForURL('/', { timeout: 15000 })
  }

  // Verify we're on dashboard
  console.log('Final URL:', page.url())
  await expect(page).toHaveURL('/')

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE })
  console.log('Auth state saved.')
})
