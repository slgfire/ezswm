import { test, expect } from '@playwright/test'

/**
 * Route smoke test: every main page must render inside the dashboard shell.
 *
 * Guards the layout-shell refactor (UDashboardGroup/Sidebar/Navbar): the default
 * layout wraps every authenticated page, so a regression there could break any of
 * them. We visit each main route and assert the shell rendered (`main#main-content`
 * visible) and the server didn't error (status < 400). Uses soft assertions so one
 * sweep reports every broken route at once.
 *
 * Detail routes (e.g. /switches/[id]) are skipped — the e2e DB has no seeded
 * entities, so list/index pages render empty states, which still exercises the shell.
 */
test('all main routes render inside the dashboard shell', async ({ page }) => {
  // Discover the current site slug for site-scoped routes.
  const sitesResp = await page.request.get('/api/sites')
  const body = await sitesResp.json().catch(() => [])
  const sites = Array.isArray(body) ? body : (body?.data ?? [])
  const sid = sites[0]?.slug ?? sites[0]?.id ?? 'all'
  const s = `/sites/${sid}`

  const routes = [
    '/', // root dashboard
    s, // site dashboard
    `${s}/switches`,
    `${s}/vlans`,
    `${s}/subnets`,
    `${s}/ip-addresses`,
    `${s}/topology`,
    '/tools/subnet-calculator',
    '/layout-templates',
    '/data-management',
    '/sites',
    '/settings'
  ]

  for (const route of routes) {
    const resp = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect.soft(resp?.status() ?? 0, `GET ${route} → status`).toBeLessThan(400)
    await expect
      .soft(page.locator('main#main-content'), `${route} → shell <main> visible`)
      .toBeVisible({ timeout: 10000 })
  }

  // Shell sidebar nav is present.
  await expect.soft(page.locator('nav a').first(), 'sidebar nav present').toBeVisible()
})
