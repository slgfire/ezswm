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

  test('public API includes helper_usage fields when set on port', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')

    // Get current switch data to find a port
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    const data = await res.json()
    expect(data.ports.length).toBeGreaterThan(0)

    // Get the actual switch to find real port IDs
    const switchesRes = await request.get(`${BASE}/api/switches`, {
      headers: { Cookie: authCookie }
    })
    const switchesData = await switchesRes.json()
    const switches = switchesData.data || switchesData
    const sw = switches[0]
    const portId = sw.ports[0].id

    // Set helper_usage on a port
    const updateRes = await request.put(`${BASE}/api/switches/${sw.id}/ports/${portId}`, {
      headers: { Cookie: authCookie },
      data: {
        helper_usage: 'orga',
        helper_label: 'VIP Area',
        show_in_helper_list: false
      }
    })
    expect(updateRes.ok()).toBeTruthy()

    // Verify public API response includes these fields
    const publicRes = await request.get(`${BASE}/api/p/${validToken}`)
    const publicData = await publicRes.json()
    const publicPort = publicData.ports[0]
    expect(publicPort.helper_usage).toBe('orga')
    expect(publicPort.helper_label).toBe('VIP Area')
    expect(publicPort.show_in_helper_list).toBe(false)

    // Clean up: reset to automatic
    await request.put(`${BASE}/api/switches/${sw.id}/ports/${portId}`, {
      headers: { Cookie: authCookie },
      data: {
        helper_usage: null,
        helper_label: null,
        show_in_helper_list: true
      }
    })
  })

  test('legacy ports without helper_usage have undefined in public API', async ({ request }) => {
    test.skip(!validToken, 'No valid token available')
    const res = await request.get(`${BASE}/api/p/${validToken}`)
    const data = await res.json()

    // Legacy ports should not have helper_usage set (undefined = omitted from JSON)
    // At least one port should exist without explicit helper_usage
    const legacyPort = data.ports.find((p: Record<string, unknown>) => !p.helper_usage)
    if (legacyPort) {
      expect(legacyPort.helper_usage).toBeUndefined()
    }
  })
})
