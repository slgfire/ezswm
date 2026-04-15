import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Public Switch View', () => {
  let validToken: string
  let authCookie: string

  test.beforeAll(async ({ request }) => {
    // Login to get auth cookie
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { username: 'admin', password: 'admin123!' }
    })
    const cookies = loginRes.headers()['set-cookie']
    authCookie = cookies?.split(';')[0] || ''

    // Find an existing switch
    const switchesRes = await request.get(`${BASE}/api/switches`, {
      headers: { Cookie: authCookie }
    })
    const switchesData = await switchesRes.json()
    const switches = switchesData.data || switchesData

    if (!Array.isArray(switches) || switches.length === 0) {
      return
    }

    const switchId = switches[0].id

    // Create public token
    const tokenRes = await request.post(`${BASE}/api/switches/${switchId}/public-token`, {
      headers: { Cookie: authCookie }
    })

    if (tokenRes.ok()) {
      const tokenData = await tokenRes.json()
      validToken = tokenData.token
    }
  })

  test('public API returns 404 for invalid token', async ({ request }) => {
    const res = await request.get(`${BASE}/api/p/nonexistent-token-12345678901`)
    expect(res.status()).toBe(404)
  })

  test('public API returns 200 for valid token', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    expect(res.status()).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('ports')
    expect(data).toHaveProperty('vlans')
    expect(data).toHaveProperty('units')
    expect(data).not.toHaveProperty('management_ip')
    expect(data).not.toHaveProperty('serial_number')
    expect(data).not.toHaveProperty('firmware_version')
    expect(data).not.toHaveProperty('notes')

    expect(res.headers()['x-robots-tag']).toBe('noindex')
    expect(res.headers()['cache-control']).toBe('no-store')
  })

  test('public API returns sanitized ports without internal IDs', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    const data = await res.json()

    if (data.ports.length > 0) {
      const port = data.ports[0]
      expect(port.id).toMatch(/^p-\d+$/)
      expect(port).not.toHaveProperty('connected_device_id')
      expect(port).not.toHaveProperty('connected_port_id')
      expect(port).not.toHaveProperty('mac_address')
      expect(port).not.toHaveProperty('lag_group_id')
      expect(port).not.toHaveProperty('connected_allocation_id')
    }
  })

  test('public page renders without login redirect', async ({ page }) => {
    test.skip(!validToken, 'No valid token available')
    await page.goto(`${BASE}/p/${validToken}`)
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/login')
    expect(page.url()).toContain(`/p/${validToken}`)
  })

  test('server auth middleware does not block /api/p/', async ({ request }) => {
    const res = await request.get(`${BASE}/api/p/some-fake-token-here-1234567`)
    expect(res.status()).toBe(404)
    expect(res.status()).not.toBe(401)
  })
})
