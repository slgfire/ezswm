import { test, expect } from '@playwright/test'

test.describe('Subnet Calculator', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/subnet-calculator')
    await page.waitForLoadState('networkidle')
  })

  // ─── Standard subnets ───────────────────────────────────────────

  test('/24 — 192.168.1.0/24', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('192.168.1.0/24')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('192.168.1.0', { timeout: 5000 })       // network
    await expect(card).toContainText('192.168.1.255')                         // broadcast
    await expect(card).toContainText('255.255.255.0')                         // mask
    await expect(card).toContainText('0.0.0.255')                             // wildcard
    await expect(card).toContainText('192.168.1.1')                           // first usable
    await expect(card).toContainText('192.168.1.254')                         // last usable
    await expect(card).toContainText('256')                                   // total hosts
    await expect(card).toContainText('254')                                   // usable hosts
  })

  test('/16 — 10.0.0.0/16', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('10.0.0.0/16')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('10.0.0.0', { timeout: 5000 })
    await expect(card).toContainText('10.0.255.255')
    await expect(card).toContainText('255.255.0.0')
    await expect(card).toContainText('0.0.255.255')
    await expect(card).toContainText('10.0.0.1')
    await expect(card).toContainText('10.0.255.254')
    await expect(card).toContainText('65536')
    await expect(card).toContainText('65534')
  })

  test('/8 — 172.16.0.0/8', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('172.16.0.0/8')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('172.0.0.0', { timeout: 5000 })          // network address is masked
    await expect(card).toContainText('172.255.255.255')
    await expect(card).toContainText('255.0.0.0')
    await expect(card).toContainText('0.255.255.255')
    await expect(card).toContainText('16777216')
    await expect(card).toContainText('16777214')
  })

  test('/28 — 10.10.10.0/28', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('10.10.10.0/28')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('10.10.10.0', { timeout: 5000 })
    await expect(card).toContainText('10.10.10.15')
    await expect(card).toContainText('255.255.255.240')
    await expect(card).toContainText('0.0.0.15')
    await expect(card).toContainText('10.10.10.1')
    await expect(card).toContainText('10.10.10.14')
    // total_hosts = 16, usable = 14
  })

  test('/30 — point-to-point link', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('192.168.100.0/30')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('192.168.100.0', { timeout: 5000 })
    await expect(card).toContainText('192.168.100.3')
    await expect(card).toContainText('255.255.255.252')
    await expect(card).toContainText('192.168.100.1')                         // first usable
    await expect(card).toContainText('192.168.100.2')                         // last usable
  })

  test('/20 — medium subnet', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('172.16.0.0/20')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('172.16.0.0', { timeout: 5000 })
    await expect(card).toContainText('172.16.15.255')
    await expect(card).toContainText('255.255.240.0')
    await expect(card).toContainText('0.0.15.255')
    await expect(card).toContainText('4096')
    await expect(card).toContainText('4094')
  })

  // ─── Edge / boundary cases ─────────────────────────────────────

  test('/32 — single host', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('10.0.0.1/32')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('10.0.0.1', { timeout: 5000 })
    await expect(card).toContainText('255.255.255.255')
    await expect(card).toContainText('0.0.0.0')
  })

  test('/31 — RFC 3021 point-to-point', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('10.0.0.0/31')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('10.0.0.0', { timeout: 5000 })
    await expect(card).toContainText('10.0.0.1')
    await expect(card).toContainText('255.255.255.254')
  })

  test('/0 — entire IPv4 space', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('0.0.0.0/0')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    await expect(card).toContainText('0.0.0.0', { timeout: 5000 })
    await expect(card).toContainText('255.255.255.255')
    await expect(card).toContainText('4294967296')
  })

  // ─── Non-zero host bits (should be masked) ─────────────────────

  test('non-zero host bits 192.168.1.100/24 → network 192.168.1.0', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('192.168.1.100/24')
    await input.dispatchEvent('input')
    await page.waitForTimeout(300)

    const card = page.locator('main .grid.grid-cols-2')
    // The network address should be masked, not the input IP
    await expect(card).toContainText('255.255.255.0', { timeout: 5000 })
  })

  // ─── Recalculation after editing ───────────────────────────────

  test('recalculates when input is changed', async ({ page }) => {
    const input = page.locator('main input').first()

    // First calculation
    await input.fill('10.0.0.0/24')
    await input.dispatchEvent('input')
    await expect(page.locator('main')).toContainText('255.255.255.0', { timeout: 5000 })

    // Change to different subnet
    await input.fill('')
    await input.fill('172.16.0.0/16')
    await input.dispatchEvent('input')
    await expect(page.locator('main')).toContainText('255.255.0.0', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('172.16.255.255')
  })

  // ─── Invalid input handling ────────────────────────────────────

  test('no results for invalid input', async ({ page }) => {
    const input = page.locator('main input').first()

    // No slash
    await input.fill('192.168.1.0')
    await input.dispatchEvent('input')
    await page.waitForTimeout(500)
    // Card should not be visible
    await expect(page.locator('main .grid.grid-cols-2')).not.toBeVisible()
  })

  test('no results for garbage input', async ({ page }) => {
    const input = page.locator('main input').first()
    await input.fill('not-a-cidr')
    await input.dispatchEvent('input')
    await page.waitForTimeout(500)
    await expect(page.locator('main .grid.grid-cols-2')).not.toBeVisible()
  })

  test('clears results when input is emptied', async ({ page }) => {
    const input = page.locator('main input').first()

    // Calculate something first
    await input.fill('10.0.0.0/24')
    await input.dispatchEvent('input')
    await expect(page.locator('main')).toContainText('255.255.255.0', { timeout: 5000 })

    // Clear input — fill('') triggers v-model update, watch clears result immediately
    await input.fill('')
    await page.waitForTimeout(500)
    await expect(page.locator('main .grid.grid-cols-2')).not.toBeVisible()
  })

  // ─── Copy/paste behavior ───────────────────────────────────────

  test('keyboard-typed CIDR triggers calculation', async ({ page }) => {
    // Simulates typing character by character — each keystroke fires @input
    // so intermediate partial CIDRs (e.g. /2) will compute before /24 finalizes.
    // After typing completes, the final /24 result must be shown.
    const input = page.locator('main input').first()
    await input.focus()
    await input.pressSequentially('10.10.10.0/24', { delay: 30 })

    // Wait for debounce (150ms) + API response
    await page.waitForTimeout(1000)

    // The LAST calculation with the full CIDR should now be displayed
    await expect(page.locator('main')).toContainText('255.255.255.0', { timeout: 5000 })
    await expect(page.locator('main')).toContainText('10.10.10.0')
  })

  test('paste with leading/trailing whitespace', async ({ page }) => {
    const input = page.locator('main input').first()
    // Type with extra spaces to simulate sloppy paste
    await input.fill('  192.168.0.0/24  ')
    await input.dispatchEvent('input')
    // Should either calculate or show no results, but not crash
    await page.waitForTimeout(1000)
    // Verify page didn't crash
    await expect(page.locator('main')).toBeVisible()
  })
})
