import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('Public Switch View', () => {
  let validToken: string
  let authCookie: string
  let lagLabelForAssertion: string | null = null

  test.beforeAll(async ({ request }) => {
    // Login to get auth cookie
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { username: 'admin', password: 'password123' }
    })
    const cookies = loginRes.headers()['set-cookie']
    authCookie = cookies?.split(';')[0] || ''

    // Find an existing switch; if none exists, provision a minimal site+template+switch.
    const listSwitches = async () => {
      const res = await request.get(`${BASE}/api/switches`, { headers: { Cookie: authCookie } })
      const json = await res.json()
      const items = json.data || json
      return Array.isArray(items) ? items : []
    }

    let switches = await listSwitches()
    if (switches.length === 0) {
      const suffix = `${Date.now()}`

      const siteRes = await request.post(`${BASE}/api/sites`, {
        headers: { Cookie: authCookie },
        data: { name: `E2E Public Site ${suffix}` }
      })
      const site = await siteRes.json()

      const templateRes = await request.post(`${BASE}/api/layout-templates`, {
        headers: { Cookie: authCookie },
        data: {
          name: `E2E Public Template ${suffix}`,
          manufacturer: 'E2E',
          model: 'Public-24',
          units: [{ unit_number: 1, label: 'Unit 1', blocks: [{ type: 'rj45', count: 24, start_index: 1, rows: 2, label: 'Gi' }] }]
        }
      })
      const template = await templateRes.json()

      await request.post(`${BASE}/api/switches`, {
        headers: { Cookie: authCookie },
        data: {
          site_id: site.id,
          name: `E2E Public Switch ${suffix}`,
          model: 'Public-24',
          manufacturer: 'E2E',
          layout_template_id: template.id
        }
      })

      switches = await listSwitches()
    }

    if (switches.length === 0) return

    const sw = switches[0]
    const switchId = sw.id

    // Create one LAG for label rendering assertion (only when feasible).
    const switchPorts = Array.isArray(sw.ports) ? sw.ports : []
    if (switchPorts.length >= 2) {
      const lagName = 'Public E2E LAG Label'
      const lagRes = await request.post(`${BASE}/api/switches/${switchId}/lag-groups`, {
        headers: { Cookie: authCookie },
        data: {
          name: lagName,
          port_ids: [switchPorts[0].id, switchPorts[1].id]
        }
      })
      if (lagRes.ok()) {
        lagLabelForAssertion = `LAG · ${lagName}`
      }
    }

    // Create public token
    const tokenRes = await request.post(`${BASE}/api/switches/${switchId}/public-token`, {
      headers: { Cookie: authCookie }
    })

    if (tokenRes.ok()) {
      const tokenData = await tokenRes.json()
      validToken = tokenData.token
      return
    }

    // If a token already exists, reuse it so tests still run on pre-seeded DBs.
    const existingTokenRes = await request.get(`${BASE}/api/switches/${switchId}/public-token`, {
      headers: { Cookie: authCookie }
    })
    if (existingTokenRes.ok()) {
      const tokenData = await existingTokenRes.json()
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

  test('public page shows LAG label with full name for LAG member', async ({ page }) => {
    test.skip(!validToken, 'No valid token available')
    test.skip(!lagLabelForAssertion, 'No LAG prepared for assertion')

    await page.goto(`${BASE}/p/${validToken}`)
    await expect(page.getByText(lagLabelForAssertion!, { exact: true }).first()).toBeVisible()
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
