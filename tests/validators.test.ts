import { describe, it } from 'node:test'
import assert from 'node:assert'

import { createUserSchema, loginSchema, changePasswordSchema } from '../server/validators/userSchemas'
import { createSwitchSchema, updatePortSchema, bulkUpdatePortsSchema } from '../server/validators/switchSchemas'
import { createVlanSchema, updateVlanSchema } from '../server/validators/vlanSchemas'
import { createNetworkSchema } from '../server/validators/networkSchemas'
import { createSiteSchema } from '../server/validators/siteSchemas'
import { createIpAllocationSchema } from '../server/validators/ipAllocationSchemas'
import { createIpRangeSchema } from '../server/validators/ipRangeSchemas'
import { createLagGroupSchema } from '../server/validators/lagGroupSchemas'
import { createLayoutTemplateSchema } from '../server/validators/layoutTemplateSchemas'
import { updateSettingsSchema } from '../server/validators/settingsSchemas'

// ─── createUserSchema ────────────────────────────────────────────────────────

describe('createUserSchema', () => {
  it('accepts valid input with all fields', () => {
    const result = createUserSchema.safeParse({
      username: 'admin_user',
      display_name: 'Admin User',
      password: 'securepass',
      role: 'viewer',
      language: 'de'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.role, 'viewer')
      assert.strictEqual(result.data.language, 'de')
    }
  })

  it('applies default role and language', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.role, 'admin')
      assert.strictEqual(result.data.language, 'en')
    }
  })

  it('rejects username shorter than 3 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'ab',
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects username longer than 50 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'a'.repeat(51),
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects username with special characters', () => {
    const result = createUserSchema.safeParse({
      username: 'user@name',
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts username with underscores', () => {
    const result = createUserSchema.safeParse({
      username: 'user_name_123',
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects empty display_name', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: '',
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects display_name longer than 100 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'x'.repeat(101),
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'short'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123',
      role: 'superadmin'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid language', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123',
      language: 'fr'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing required fields', () => {
    const result = createUserSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })

  it('rejects missing username', () => {
    const result = createUserSchema.safeParse({
      display_name: 'Test',
      password: 'password123'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing password', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test'
    })
    assert.strictEqual(result.success, false)
  })
})

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'pass'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.remember_me, false)
    }
  })

  it('accepts remember_me true', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'pass',
      remember_me: true
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.remember_me, true)
    }
  })

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'pass'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: ''
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })
})

// ─── changePasswordSchema ────────────────────────────────────────────────────

describe('changePasswordSchema', () => {
  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'oldpass',
      new_password: 'newpass12'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects empty current_password', () => {
    const result = changePasswordSchema.safeParse({
      current_password: '',
      new_password: 'newpass12'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects new_password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'oldpass',
      new_password: 'short'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing fields', () => {
    const result = changePasswordSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })
})

// ─── createSwitchSchema ──────────────────────────────────────────────────────

describe('createSwitchSchema', () => {
  it('accepts valid switch with required fields', () => {
    const result = createSwitchSchema.safeParse({
      site_id: 'site-1',
      name: 'Core Switch'
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts valid switch with all optional fields', () => {
    const result = createSwitchSchema.safeParse({
      site_id: 'site-1',
      name: 'Core Switch',
      model: 'Catalyst 9300',
      manufacturer: 'Cisco',
      serial_number: 'SN12345',
      location: 'Rack A',
      rack_position: 'U12',
      management_ip: '10.0.0.1',
      firmware_version: '17.3.5',
      layout_template_id: 'tpl-1',
      stack_size: 4,
      role: 'core',
      tags: ['production', 'critical'],
      notes: 'Main core switch'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects missing site_id', () => {
    const result = createSwitchSchema.safeParse({ name: 'Switch' })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing name', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1' })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty name', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: '' })
    assert.strictEqual(result.success, false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'x'.repeat(101) })
    assert.strictEqual(result.success, false)
  })

  it('rejects stack_size less than 1', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 0 })
    assert.strictEqual(result.success, false)
  })

  it('rejects stack_size greater than 8', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 9 })
    assert.strictEqual(result.success, false)
  })

  it('rejects non-integer stack_size', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 2.5 })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid role', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', role: 'invalid' })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid roles', () => {
    for (const role of ['core', 'distribution', 'access', 'management']) {
      const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', role })
      assert.strictEqual(result.success, true, `role "${role}" should be valid`)
    }
  })

  it('rejects tags array exceeding 20 items', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', tags })
    assert.strictEqual(result.success, false)
  })

  it('rejects tag longer than 50 chars', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', tags: ['x'.repeat(51)] })
    assert.strictEqual(result.success, false)
  })
})

// ─── updatePortSchema ────────────────────────────────────────────────────────

describe('updatePortSchema', () => {
  it('accepts valid port update', () => {
    const result = updatePortSchema.safeParse({
      label: 'Uplink',
      speed: '10G',
      status: 'up',
      port_mode: 'trunk',
      access_vlan: 100,
      native_vlan: 1,
      tagged_vlans: [10, 20, 30],
      connected_device: 'Server-01',
      description: 'Uplink to core'
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts empty object', () => {
    const result = updatePortSchema.safeParse({})
    assert.strictEqual(result.success, true)
  })

  it('preprocesses empty string speed to null', () => {
    const result = updatePortSchema.safeParse({ speed: '' })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.speed, null)
    }
  })

  it('preprocesses empty string port_mode to null', () => {
    const result = updatePortSchema.safeParse({ port_mode: '' })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.port_mode, null)
    }
  })

  it('accepts valid speed values', () => {
    for (const speed of ['100M', '1G', '2.5G', '10G', '100G']) {
      const result = updatePortSchema.safeParse({ speed })
      assert.strictEqual(result.success, true, `speed "${speed}" should be valid`)
    }
  })

  it('rejects invalid speed value', () => {
    const result = updatePortSchema.safeParse({ speed: '5G' })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid status', () => {
    const result = updatePortSchema.safeParse({ status: 'unknown' })
    assert.strictEqual(result.success, false)
  })

  it('accepts valid status values', () => {
    for (const status of ['up', 'down', 'disabled']) {
      const result = updatePortSchema.safeParse({ status })
      assert.strictEqual(result.success, true, `status "${status}" should be valid`)
    }
  })

  it('rejects invalid port_mode', () => {
    const result = updatePortSchema.safeParse({ port_mode: 'hybrid' })
    assert.strictEqual(result.success, false)
  })

  it('rejects access_vlan below 1', () => {
    const result = updatePortSchema.safeParse({ access_vlan: 0 })
    assert.strictEqual(result.success, false)
  })

  it('rejects access_vlan above 4094', () => {
    const result = updatePortSchema.safeParse({ access_vlan: 4095 })
    assert.strictEqual(result.success, false)
  })

  it('rejects native_vlan below 1', () => {
    const result = updatePortSchema.safeParse({ native_vlan: 0 })
    assert.strictEqual(result.success, false)
  })

  it('rejects native_vlan above 4094', () => {
    const result = updatePortSchema.safeParse({ native_vlan: 4095 })
    assert.strictEqual(result.success, false)
  })

  it('rejects tagged_vlans with value out of range', () => {
    const result = updatePortSchema.safeParse({ tagged_vlans: [1, 4095] })
    assert.strictEqual(result.success, false)
  })

  it('accepts poe configuration', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: '802.3at', max_watts: 30 }
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts poe null to clear', () => {
    const result = updatePortSchema.safeParse({ poe: null })
    assert.strictEqual(result.success, true)
  })

  it('rejects poe with invalid type', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: 'invalid', max_watts: 30 }
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects poe with non-positive watts', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: '802.3af', max_watts: 0 }
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid poe types', () => {
    for (const type of ['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4', 'passive-24v', 'passive-48v']) {
      const result = updatePortSchema.safeParse({ poe: { type, max_watts: 15 } })
      assert.strictEqual(result.success, true, `poe type "${type}" should be valid`)
    }
  })
})

// ─── bulkUpdatePortsSchema ───────────────────────────────────────────────────

describe('bulkUpdatePortsSchema', () => {
  it('accepts valid bulk update', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1', 'p2'],
      updates: { status: 'up', speed: '1G' }
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects empty port_ids array', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: [],
      updates: { status: 'up' }
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing port_ids', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      updates: { status: 'up' }
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing updates', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1']
    })
    assert.strictEqual(result.success, false)
  })

  it('preprocesses empty string speed in updates to null', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1'],
      updates: { speed: '' }
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.updates.speed, null)
    }
  })

  it('preprocesses empty string port_mode in updates to null', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1'],
      updates: { port_mode: '' }
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.updates.port_mode, null)
    }
  })
})

// ─── createVlanSchema ────────────────────────────────────────────────────────

describe('createVlanSchema', () => {
  it('accepts valid VLAN', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 100,
      name: 'Management'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.status, 'active')
    }
  })

  it('accepts valid VLAN with all optional fields', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 200,
      name: 'Guest',
      description: 'Guest network',
      status: 'inactive',
      routing_device: 'Router-1',
      color: '#FF5733'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects vlan_id below 1', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 0,
      name: 'Test'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects vlan_id above 4094', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 4095,
      name: 'Test'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts vlan_id boundary values', () => {
    const r1 = createVlanSchema.safeParse({ site_id: 's', vlan_id: 1, name: 'T' })
    const r2 = createVlanSchema.safeParse({ site_id: 's', vlan_id: 4094, name: 'T' })
    assert.strictEqual(r1.success, true)
    assert.strictEqual(r2.success, true)
  })

  it('rejects non-integer vlan_id', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10.5,
      name: 'Test'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid color format', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: 'red'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects color without hash', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: 'FF5733'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects short hex color', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: '#FFF'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts valid hex color', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: '#aaBB00'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects invalid status', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      status: 'deprecated'
    })
    assert.strictEqual(result.success, false)
  })

  it('defaults status to active', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.status, 'active')
    }
  })

  it('rejects missing required fields', () => {
    const result = createVlanSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })
})

// ─── updateVlanSchema ────────────────────────────────────────────────────────

describe('updateVlanSchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = updateVlanSchema.safeParse({})
    assert.strictEqual(result.success, true)
  })

  it('accepts partial update', () => {
    const result = updateVlanSchema.safeParse({ name: 'Updated' })
    assert.strictEqual(result.success, true)
  })

  it('accepts nullable description', () => {
    const result = updateVlanSchema.safeParse({ description: null })
    assert.strictEqual(result.success, true)
  })

  it('rejects invalid vlan_id', () => {
    const result = updateVlanSchema.safeParse({ vlan_id: 5000 })
    assert.strictEqual(result.success, false)
  })
})

// ─── createNetworkSchema ─────────────────────────────────────────────────────

describe('createNetworkSchema', () => {
  it('accepts valid network with required fields', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Production',
      subnet: '10.0.0.0/24'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.deepStrictEqual(result.data.dns_servers, [])
    }
  })

  it('accepts valid network with all fields', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Production',
      subnet: '10.0.0.0/24',
      vlan_id: 'vlan-1',
      gateway: '10.0.0.1',
      dns_servers: ['8.8.8.8', '8.8.4.4'],
      description: 'Prod network'
    })
    assert.strictEqual(result.success, true)
  })

  it('defaults dns_servers to empty array', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Net',
      subnet: '192.168.0.0/24'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.deepStrictEqual(result.data.dns_servers, [])
    }
  })

  it('rejects missing site_id', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Net',
      subnet: '10.0.0.0/24'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing name', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      subnet: '10.0.0.0/24'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing subnet', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Net'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty name', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: '',
      subnet: '10.0.0.0/24'
    })
    assert.strictEqual(result.success, false)
  })
})

// ─── createSiteSchema ────────────────────────────────────────────────────────

describe('createSiteSchema', () => {
  it('accepts valid site', () => {
    const result = createSiteSchema.safeParse({ name: 'Main Office' })
    assert.strictEqual(result.success, true)
  })

  it('accepts site with description', () => {
    const result = createSiteSchema.safeParse({
      name: 'Data Center',
      description: 'Primary DC'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects empty name', () => {
    const result = createSiteSchema.safeParse({ name: '' })
    assert.strictEqual(result.success, false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createSiteSchema.safeParse({ name: 'x'.repeat(101) })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing name', () => {
    const result = createSiteSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })

  it('rejects description longer than 500 chars', () => {
    const result = createSiteSchema.safeParse({
      name: 'Site',
      description: 'x'.repeat(501)
    })
    assert.strictEqual(result.success, false)
  })
})

// ─── createIpAllocationSchema ────────────────────────────────────────────────

describe('createIpAllocationSchema', () => {
  it('accepts valid allocation with required fields', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.50'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.status, 'active')
    }
  })

  it('accepts valid allocation with all fields', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.50',
      hostname: 'server-01',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      device_type: 'server',
      description: 'Web server',
      status: 'reserved'
    })
    assert.strictEqual(result.success, true)
  })

  it('defaults status to active', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1'
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.status, 'active')
    }
  })

  it('rejects missing ip_address', () => {
    const result = createIpAllocationSchema.safeParse({})
    assert.strictEqual(result.success, false)
  })

  it('rejects empty ip_address', () => {
    const result = createIpAllocationSchema.safeParse({ ip_address: '' })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid device_type', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1',
      device_type: 'workstation'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid device_types', () => {
    for (const device_type of ['server', 'switch', 'printer', 'phone', 'ap', 'camera', 'other']) {
      const result = createIpAllocationSchema.safeParse({ ip_address: '10.0.0.1', device_type })
      assert.strictEqual(result.success, true, `device_type "${device_type}" should be valid`)
    }
  })

  it('rejects invalid status', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1',
      status: 'expired'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid status values', () => {
    for (const status of ['active', 'reserved', 'inactive']) {
      const result = createIpAllocationSchema.safeParse({ ip_address: '10.0.0.1', status })
      assert.strictEqual(result.success, true, `status "${status}" should be valid`)
    }
  })
})

// ─── createIpRangeSchema ─────────────────────────────────────────────────────

describe('createIpRangeSchema', () => {
  it('accepts valid IP range', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100',
      type: 'dhcp'
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts valid IP range with description', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100',
      type: 'static',
      description: 'Server pool'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects missing start_ip', () => {
    const result = createIpRangeSchema.safeParse({
      end_ip: '10.0.0.100',
      type: 'dhcp'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing end_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      type: 'dhcp'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing type', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid type', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100',
      type: 'dynamic'
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid types', () => {
    for (const type of ['static', 'dhcp', 'reserved']) {
      const result = createIpRangeSchema.safeParse({
        start_ip: '10.0.0.1',
        end_ip: '10.0.0.100',
        type
      })
      assert.strictEqual(result.success, true, `type "${type}" should be valid`)
    }
  })

  it('rejects empty start_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '',
      end_ip: '10.0.0.100',
      type: 'dhcp'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty end_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '',
      type: 'dhcp'
    })
    assert.strictEqual(result.success, false)
  })
})

// ─── createLagGroupSchema ────────────────────────────────────────────────────

describe('createLagGroupSchema', () => {
  it('accepts valid LAG group', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1', 'p2']
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts LAG group with all optional fields', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1', 'p2', 'p3'],
      remote_device: 'Switch-02',
      remote_device_id: 'sw-2',
      description: 'Uplink LAG'
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects missing name', () => {
    const result = createLagGroupSchema.safeParse({
      port_ids: ['p1', 'p2']
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty name', () => {
    const result = createLagGroupSchema.safeParse({
      name: '',
      port_ids: ['p1', 'p2']
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'x'.repeat(101),
      port_ids: ['p1', 'p2']
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects port_ids with fewer than 2 entries', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1']
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty port_ids', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: []
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing port_ids', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1'
    })
    assert.strictEqual(result.success, false)
  })
})

// ─── createLayoutTemplateSchema ──────────────────────────────────────────────

describe('createLayoutTemplateSchema', () => {
  const validBlock = {
    type: 'rj45' as const,
    count: 24,
    start_index: 0,
    rows: 2
  }

  const validUnit = {
    unit_number: 1,
    blocks: [validBlock]
  }

  it('accepts valid template with required fields', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Standard 24-port',
      units: [validUnit]
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts valid template with all optional fields', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Standard 24-port',
      manufacturer: 'Cisco',
      model: 'Catalyst 9300',
      description: 'Standard access switch',
      datasheet_url: 'https://example.com/datasheet.pdf',
      airflow: 'front-to-rear',
      units: [validUnit]
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects missing name', () => {
    const result = createLayoutTemplateSchema.safeParse({
      units: [validUnit]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects missing units', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template'
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty units array', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: []
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty blocks array in unit', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{ unit_number: 1, blocks: [] }]
    })
    assert.strictEqual(result.success, false)
  })

  it('preprocesses empty string airflow to undefined', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      airflow: '',
      units: [validUnit]
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.airflow, undefined)
    }
  })

  it('accepts all valid airflow values', () => {
    for (const airflow of ['front-to-rear', 'rear-to-front', 'left-to-right', 'right-to-left', 'passive', 'mixed']) {
      const result = createLayoutTemplateSchema.safeParse({
        name: 'Template',
        airflow,
        units: [validUnit]
      })
      assert.strictEqual(result.success, true, `airflow "${airflow}" should be valid`)
    }
  })

  it('rejects invalid airflow', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      airflow: 'top-down',
      units: [validUnit]
    })
    assert.strictEqual(result.success, false)
  })

  it('preprocesses empty string row_layout to undefined in block', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'rj45',
          count: 24,
          start_index: 0,
          rows: 2,
          row_layout: ''
        }]
      }]
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.units[0].blocks[0].row_layout, undefined)
    }
  })

  it('preprocesses empty string default_speed to undefined in block', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'rj45',
          count: 24,
          start_index: 0,
          rows: 2,
          default_speed: ''
        }]
      }]
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.units[0].blocks[0].default_speed, undefined)
    }
  })

  it('preprocesses empty string physical_type to undefined in block', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'management',
          count: 1,
          start_index: 0,
          rows: 1,
          physical_type: ''
        }]
      }]
    })
    assert.strictEqual(result.success, true)
    if (result.success) {
      assert.strictEqual(result.data.units[0].blocks[0].physical_type, undefined)
    }
  })

  it('allows physical_type on management block type', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'management',
          count: 1,
          start_index: 0,
          rows: 1,
          physical_type: 'rj45'
        }]
      }]
    })
    assert.strictEqual(result.success, true)
  })

  it('rejects physical_type on non-management block type', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'rj45',
          count: 24,
          start_index: 0,
          rows: 2,
          physical_type: 'rj45'
        }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects physical_type on sfp block type', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'sfp',
          count: 4,
          start_index: 0,
          rows: 1,
          physical_type: 'sfp'
        }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts all valid block types', () => {
    for (const type of ['rj45', 'sfp', 'sfp+', 'qsfp', 'console', 'management']) {
      const result = createLayoutTemplateSchema.safeParse({
        name: 'Template',
        units: [{
          unit_number: 1,
          blocks: [{ type, count: 1, start_index: 0, rows: 1 }]
        }]
      })
      assert.strictEqual(result.success, true, `block type "${type}" should be valid`)
    }
  })

  it('rejects invalid block type', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'usb', count: 1, start_index: 0, rows: 1 }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects block with zero count', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 0, start_index: 0, rows: 1 }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects block with negative start_index', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 24, start_index: -1, rows: 1 }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects block with zero rows', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 24, start_index: 0, rows: 0 }]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects unit with zero unit_number', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 0,
        blocks: [validBlock]
      }]
    })
    assert.strictEqual(result.success, false)
  })

  it('rejects invalid datasheet_url', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      datasheet_url: 'not-a-url',
      units: [validUnit]
    })
    assert.strictEqual(result.success, false)
  })

  it('accepts valid row_layout values', () => {
    for (const row_layout of ['sequential', 'odd-even', 'even-odd']) {
      const result = createLayoutTemplateSchema.safeParse({
        name: 'Template',
        units: [{
          unit_number: 1,
          blocks: [{ type: 'rj45', count: 24, start_index: 0, rows: 2, row_layout }]
        }]
      })
      assert.strictEqual(result.success, true, `row_layout "${row_layout}" should be valid`)
    }
  })

  it('accepts block with poe config', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{
          type: 'rj45',
          count: 24,
          start_index: 0,
          rows: 2,
          poe: { type: '802.3at', max_watts: 30 }
        }]
      }]
    })
    assert.strictEqual(result.success, true)
  })
})

// ─── updateSettingsSchema ────────────────────────────────────────────────────

describe('updateSettingsSchema', () => {
  it('accepts valid settings update', () => {
    const result = updateSettingsSchema.safeParse({
      app_name: 'My Network',
      pagination_size: 25
    })
    assert.strictEqual(result.success, true)
  })

  it('accepts empty object (all optional)', () => {
    const result = updateSettingsSchema.safeParse({})
    assert.strictEqual(result.success, true)
  })

  it('rejects pagination_size below 10', () => {
    const result = updateSettingsSchema.safeParse({ pagination_size: 5 })
    assert.strictEqual(result.success, false)
  })

  it('rejects pagination_size above 100', () => {
    const result = updateSettingsSchema.safeParse({ pagination_size: 101 })
    assert.strictEqual(result.success, false)
  })

  it('accepts pagination_size boundary values', () => {
    const r1 = updateSettingsSchema.safeParse({ pagination_size: 10 })
    const r2 = updateSettingsSchema.safeParse({ pagination_size: 100 })
    assert.strictEqual(r1.success, true)
    assert.strictEqual(r2.success, true)
  })

  it('rejects non-integer pagination_size', () => {
    const result = updateSettingsSchema.safeParse({ pagination_size: 25.5 })
    assert.strictEqual(result.success, false)
  })

  it('rejects empty app_name', () => {
    const result = updateSettingsSchema.safeParse({ app_name: '' })
    assert.strictEqual(result.success, false)
  })

  it('rejects app_name longer than 100 chars', () => {
    const result = updateSettingsSchema.safeParse({ app_name: 'x'.repeat(101) })
    assert.strictEqual(result.success, false)
  })

  it('accepts default_vlan in valid range', () => {
    const result = updateSettingsSchema.safeParse({ default_vlan: 100 })
    assert.strictEqual(result.success, true)
  })

  it('rejects default_vlan out of range', () => {
    const r1 = updateSettingsSchema.safeParse({ default_vlan: 0 })
    const r2 = updateSettingsSchema.safeParse({ default_vlan: 4095 })
    assert.strictEqual(r1.success, false)
    assert.strictEqual(r2.success, false)
  })

  it('accepts nullable default_vlan', () => {
    const result = updateSettingsSchema.safeParse({ default_vlan: null })
    assert.strictEqual(result.success, true)
  })

  it('accepts valid default_port_status', () => {
    for (const status of ['up', 'down', 'disabled']) {
      const result = updateSettingsSchema.safeParse({ default_port_status: status })
      assert.strictEqual(result.success, true, `default_port_status "${status}" should be valid`)
    }
  })

  it('rejects invalid default_port_status', () => {
    const result = updateSettingsSchema.safeParse({ default_port_status: 'unknown' })
    assert.strictEqual(result.success, false)
  })

  it('accepts port_speeds array', () => {
    const result = updateSettingsSchema.safeParse({ port_speeds: ['1G', '10G'] })
    assert.strictEqual(result.success, true)
  })
})
