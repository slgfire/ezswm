import { test as setup, expect } from '@playwright/test'

// Runs against the fresh main server only (initializes it, then saves the session).
setup('authenticate', async ({ page, baseURL }) => {
  const authFile = process.env.E2E_AUTH_FILE!
  const setupResponse = await page.request.post('/api/auth/setup', {
    data: { username: 'admin', display_name: 'Test Admin', password: 'password123', language: 'en' }
  })
  expect(setupResponse.ok()).toBe(true)
  const { token } = await setupResponse.json() as { token?: string }
  expect(token).toBeTruthy()
  await page.context().addCookies([{
    name: 'ezswm_token',
    value: token!,
    url: baseURL!,
    httpOnly: true,
    sameSite: 'Lax'
  }])

  const siteResponse = await page.request.post('/api/setup/initial-site', { data: { name: 'E2E Site' } })
  expect(siteResponse.ok()).toBe(true)

  await page.goto('/')
  await expect(page).toHaveURL('/')
  await page.context().storageState({ path: authFile })
})
