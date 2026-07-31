import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = './tests/e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(1000)

  const url = page.url()
  console.log('Initial URL:', url)

  if (url.includes('/setup')) {
    console.log('Performing first-time setup via API...')

    const setupResponse = await page.request.post('/api/auth/setup', {
      data: {
        username: 'admin',
        display_name: 'Test Admin',
        password: 'password123',
        language: 'en'
      }
    })
    expect(setupResponse.ok()).toBe(true)
    const setupJson = await setupResponse.json() as { token?: string }
    expect(setupJson.token).toBeTruthy()
    await page.context().addCookies([{
      name: 'ezswm_token',
      value: setupJson.token!,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    }])

    const initialSiteResponse = await page.request.post('/api/setup/initial-site', {
      data: {
        name: 'E2E Site'
      }
    })
    expect(initialSiteResponse.ok()).toBe(true)

    await page.goto('/')
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
