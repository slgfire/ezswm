import { createUserSchema, loginSchema, changePasswordSchema } from '../server/validators/userSchemas'
import { createSwitchSchema, updateSwitchSchema, updatePortSchema, bulkUpdatePortsSchema } from '../server/validators/switchSchemas'
import { createVlanSchema, updateVlanSchema } from '../server/validators/vlanSchemas'
import { createNetworkSchema, updateNetworkSchema } from '../server/validators/networkSchemas'
import { createSiteSchema, updateSiteSchema } from '../server/validators/siteSchemas'
import { createIpAllocationSchema, updateIpAllocationSchema } from '../server/validators/ipAllocationSchemas'
import { createIpRangeSchema, updateIpRangeSchema } from '../server/validators/ipRangeSchemas'
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('viewer')
      expect(result.data.language).toBe('de')
    }
  })

  it('applies default role and language', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('admin')
      expect(result.data.language).toBe('en')
    }
  })

  it('rejects username shorter than 3 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'ab',
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects username longer than 50 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'a'.repeat(51),
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects username with special characters', () => {
    const result = createUserSchema.safeParse({
      username: 'user@name',
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('accepts username with underscores', () => {
    const result = createUserSchema.safeParse({
      username: 'user_name_123',
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty display_name', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: '',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects display_name longer than 100 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'x'.repeat(101),
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'short'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123',
      role: 'superadmin'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid language', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test',
      password: 'password123',
      language: 'fr'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = createUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects missing username', () => {
    const result = createUserSchema.safeParse({
      display_name: 'Test',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing password', () => {
    const result = createUserSchema.safeParse({
      username: 'testuser',
      display_name: 'Test'
    })
    expect(result.success).toBe(false)
  })
})

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'pass'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.remember_me).toBe(false)
    }
  })

  it('accepts remember_me true', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: 'pass',
      remember_me: true
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.remember_me).toBe(true)
    }
  })

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({
      username: '',
      password: 'pass'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      username: 'admin',
      password: ''
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── changePasswordSchema ────────────────────────────────────────────────────

describe('changePasswordSchema', () => {
  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'oldpass',
      new_password: 'newpass12'
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty current_password', () => {
    const result = changePasswordSchema.safeParse({
      current_password: '',
      new_password: 'newpass12'
    })
    expect(result.success).toBe(false)
  })

  it('rejects new_password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      current_password: 'oldpass',
      new_password: 'short'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = changePasswordSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── createSwitchSchema ──────────────────────────────────────────────────────

describe('createSwitchSchema', () => {
  it('accepts valid switch with required fields', () => {
    const result = createSwitchSchema.safeParse({
      site_id: 'site-1',
      name: 'Core Switch'
    })
    expect(result.success).toBe(true)
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
    expect(result.success).toBe(true)
  })

  it('rejects missing site_id', () => {
    const result = createSwitchSchema.safeParse({ name: 'Switch' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects stack_size less than 1', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects stack_size greater than 8', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 9 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer stack_size', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', stack_size: 2.5 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', role: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid roles', () => {
    for (const role of ['core', 'distribution', 'access', 'management']) {
      const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', role })
      expect(result.success, `role "${role}" should be valid`).toBe(true)
    }
  })

  it('rejects tags array exceeding 20 items', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', tags })
    expect(result.success).toBe(false)
  })

  it('rejects tag longer than 50 chars', () => {
    const result = createSwitchSchema.safeParse({ site_id: 'site-1', name: 'SW', tags: ['x'.repeat(51)] })
    expect(result.success).toBe(false)
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
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updatePortSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('preprocesses empty string speed to null', () => {
    const result = updatePortSchema.safeParse({ speed: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.speed).toBe(null)
    }
  })

  it('preprocesses empty string port_mode to null', () => {
    const result = updatePortSchema.safeParse({ port_mode: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.port_mode).toBe(null)
    }
  })

  it('accepts valid speed values', () => {
    for (const speed of ['100M', '1G', '2.5G', '10G', '100G']) {
      const result = updatePortSchema.safeParse({ speed })
      expect(result.success, `speed "${speed}" should be valid`).toBe(true)
    }
  })

  it('rejects invalid speed value', () => {
    const result = updatePortSchema.safeParse({ speed: '5G' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = updatePortSchema.safeParse({ status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('accepts valid status values', () => {
    for (const status of ['up', 'down', 'disabled']) {
      const result = updatePortSchema.safeParse({ status })
      expect(result.success, `status "${status}" should be valid`).toBe(true)
    }
  })

  it('rejects invalid port_mode', () => {
    const result = updatePortSchema.safeParse({ port_mode: 'hybrid' })
    expect(result.success).toBe(false)
  })

  it('rejects access_vlan below 1', () => {
    const result = updatePortSchema.safeParse({ access_vlan: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects access_vlan above 4094', () => {
    const result = updatePortSchema.safeParse({ access_vlan: 4095 })
    expect(result.success).toBe(false)
  })

  it('rejects native_vlan below 1', () => {
    const result = updatePortSchema.safeParse({ native_vlan: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects native_vlan above 4094', () => {
    const result = updatePortSchema.safeParse({ native_vlan: 4095 })
    expect(result.success).toBe(false)
  })

  it('rejects tagged_vlans with value out of range', () => {
    const result = updatePortSchema.safeParse({ tagged_vlans: [1, 4095] })
    expect(result.success).toBe(false)
  })

  it('accepts poe configuration', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: '802.3at', max_watts: 30 }
    })
    expect(result.success).toBe(true)
  })

  it('accepts poe null to clear', () => {
    const result = updatePortSchema.safeParse({ poe: null })
    expect(result.success).toBe(true)
  })

  it('rejects poe with invalid type', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: 'invalid', max_watts: 30 }
    })
    expect(result.success).toBe(false)
  })

  it('rejects poe with non-positive watts', () => {
    const result = updatePortSchema.safeParse({
      poe: { type: '802.3af', max_watts: 0 }
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid poe types', () => {
    for (const type of ['802.3af', '802.3at', '802.3bt-type3', '802.3bt-type4', 'passive-24v', 'passive-48v']) {
      const result = updatePortSchema.safeParse({ poe: { type, max_watts: 15 } })
      expect(result.success, `poe type "${type}" should be valid`).toBe(true)
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
    expect(result.success).toBe(true)
  })

  it('rejects empty port_ids array', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: [],
      updates: { status: 'up' }
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing port_ids', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      updates: { status: 'up' }
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing updates', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1']
    })
    expect(result.success).toBe(false)
  })

  it('preprocesses empty string speed in updates to null', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1'],
      updates: { speed: '' }
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.updates.speed).toBe(null)
    }
  })

  it('preprocesses empty string port_mode in updates to null', () => {
    const result = bulkUpdatePortsSchema.safeParse({
      port_ids: ['p1'],
      updates: { port_mode: '' }
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.updates.port_mode).toBe(null)
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
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
    expect(result.success).toBe(true)
  })

  it('rejects vlan_id below 1', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 0,
      name: 'Test'
    })
    expect(result.success).toBe(false)
  })

  it('rejects vlan_id above 4094', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 4095,
      name: 'Test'
    })
    expect(result.success).toBe(false)
  })

  it('accepts vlan_id boundary values', () => {
    const r1 = createVlanSchema.safeParse({ site_id: 's', vlan_id: 1, name: 'T' })
    const r2 = createVlanSchema.safeParse({ site_id: 's', vlan_id: 4094, name: 'T' })
    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
  })

  it('rejects non-integer vlan_id', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10.5,
      name: 'Test'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid color format', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: 'red'
    })
    expect(result.success).toBe(false)
  })

  it('rejects color without hash', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: 'FF5733'
    })
    expect(result.success).toBe(false)
  })

  it('rejects short hex color', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: '#FFF'
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid hex color', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      color: '#aaBB00'
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test',
      status: 'deprecated'
    })
    expect(result.success).toBe(false)
  })

  it('defaults status to active', () => {
    const result = createVlanSchema.safeParse({
      site_id: 'site-1',
      vlan_id: 10,
      name: 'Test'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
    }
  })

  it('rejects missing required fields', () => {
    const result = createVlanSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── updateVlanSchema ────────────────────────────────────────────────────────

describe('updateVlanSchema', () => {
  it('accepts empty object (all optional)', () => {
    const result = updateVlanSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateVlanSchema.safeParse({ name: 'Updated' })
    expect(result.success).toBe(true)
  })

  it('accepts nullable description', () => {
    const result = updateVlanSchema.safeParse({ description: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid vlan_id', () => {
    const result = updateVlanSchema.safeParse({ vlan_id: 5000 })
    expect(result.success).toBe(false)
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dns_servers).toEqual([])
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
    expect(result.success).toBe(true)
  })

  it('defaults dns_servers to empty array', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Net',
      subnet: '192.168.0.0/24'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dns_servers).toEqual([])
    }
  })

  it('rejects missing site_id', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Net',
      subnet: '10.0.0.0/24'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      subnet: '10.0.0.0/24'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing subnet', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: 'Net'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createNetworkSchema.safeParse({
      site_id: 'site-1',
      name: '',
      subnet: '10.0.0.0/24'
    })
    expect(result.success).toBe(false)
  })
})

// ─── createSiteSchema ────────────────────────────────────────────────────────

describe('createSiteSchema', () => {
  it('accepts valid site', () => {
    const result = createSiteSchema.safeParse({ name: 'Main Office' })
    expect(result.success).toBe(true)
  })

  it('accepts site with description', () => {
    const result = createSiteSchema.safeParse({
      name: 'Data Center',
      description: 'Primary DC'
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createSiteSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createSiteSchema.safeParse({ name: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createSiteSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects description longer than 500 chars', () => {
    const result = createSiteSchema.safeParse({
      name: 'Site',
      description: 'x'.repeat(501)
    })
    expect(result.success).toBe(false)
  })
})

// ─── createIpAllocationSchema ────────────────────────────────────────────────

describe('createIpAllocationSchema', () => {
  it('accepts valid allocation with required fields', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.50'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
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
    expect(result.success).toBe(true)
  })

  it('defaults status to active', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1'
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
    }
  })

  it('rejects missing ip_address', () => {
    const result = createIpAllocationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty ip_address', () => {
    const result = createIpAllocationSchema.safeParse({ ip_address: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid device_type', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1',
      device_type: 'workstation'
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid device_types', () => {
    for (const device_type of ['server', 'switch', 'printer', 'phone', 'ap', 'camera', 'other']) {
      const result = createIpAllocationSchema.safeParse({ ip_address: '10.0.0.1', device_type })
      expect(result.success, `device_type "${device_type}" should be valid`).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = createIpAllocationSchema.safeParse({
      ip_address: '10.0.0.1',
      status: 'expired'
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid status values', () => {
    for (const status of ['active', 'reserved', 'inactive']) {
      const result = createIpAllocationSchema.safeParse({ ip_address: '10.0.0.1', status })
      expect(result.success, `status "${status}" should be valid`).toBe(true)
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
    expect(result.success).toBe(true)
  })

  it('accepts valid IP range with description', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100',
      type: 'static',
      description: 'Server pool'
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing start_ip', () => {
    const result = createIpRangeSchema.safeParse({
      end_ip: '10.0.0.100',
      type: 'dhcp'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing end_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      type: 'dhcp'
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '10.0.0.100',
      type: 'dynamic'
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid types', () => {
    for (const type of ['static', 'dhcp', 'reserved']) {
      const result = createIpRangeSchema.safeParse({
        start_ip: '10.0.0.1',
        end_ip: '10.0.0.100',
        type
      })
      expect(result.success, `type "${type}" should be valid`).toBe(true)
    }
  })

  it('rejects empty start_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '',
      end_ip: '10.0.0.100',
      type: 'dhcp'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty end_ip', () => {
    const result = createIpRangeSchema.safeParse({
      start_ip: '10.0.0.1',
      end_ip: '',
      type: 'dhcp'
    })
    expect(result.success).toBe(false)
  })
})

// ─── createLagGroupSchema ────────────────────────────────────────────────────

describe('createLagGroupSchema', () => {
  it('accepts valid LAG group', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1', 'p2']
    })
    expect(result.success).toBe(true)
  })

  it('accepts LAG group with all optional fields', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1', 'p2', 'p3'],
      remote_device: 'Switch-02',
      remote_device_id: 'sw-2',
      description: 'Uplink LAG'
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createLagGroupSchema.safeParse({
      port_ids: ['p1', 'p2']
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createLagGroupSchema.safeParse({
      name: '',
      port_ids: ['p1', 'p2']
    })
    expect(result.success).toBe(false)
  })

  it('rejects name longer than 100 chars', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'x'.repeat(101),
      port_ids: ['p1', 'p2']
    })
    expect(result.success).toBe(false)
  })

  it('rejects port_ids with fewer than 2 entries', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: ['p1']
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty port_ids', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1',
      port_ids: []
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing port_ids', () => {
    const result = createLagGroupSchema.safeParse({
      name: 'Po1'
    })
    expect(result.success).toBe(false)
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
    expect(result.success).toBe(true)
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
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createLayoutTemplateSchema.safeParse({
      units: [validUnit]
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing units', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty units array', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: []
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty blocks array in unit', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{ unit_number: 1, blocks: [] }]
    })
    expect(result.success).toBe(false)
  })

  it('preprocesses empty string airflow to undefined', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      airflow: '',
      units: [validUnit]
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.airflow).toBe(undefined)
    }
  })

  it('accepts all valid airflow values', () => {
    for (const airflow of ['front-to-rear', 'rear-to-front', 'left-to-right', 'right-to-left', 'passive', 'mixed']) {
      const result = createLayoutTemplateSchema.safeParse({
        name: 'Template',
        airflow,
        units: [validUnit]
      })
      expect(result.success, `airflow "${airflow}" should be valid`).toBe(true)
    }
  })

  it('rejects invalid airflow', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      airflow: 'top-down',
      units: [validUnit]
    })
    expect(result.success).toBe(false)
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.units[0].blocks[0].row_layout).toBe(undefined)
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.units[0].blocks[0].default_speed).toBe(undefined)
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
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.units[0].blocks[0].physical_type).toBe(undefined)
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
    expect(result.success).toBe(true)
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
    expect(result.success).toBe(false)
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
    expect(result.success).toBe(false)
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
      expect(result.success, `block type "${type}" should be valid`).toBe(true)
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
    expect(result.success).toBe(false)
  })

  it('rejects block with zero count', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 0, start_index: 0, rows: 1 }]
      }]
    })
    expect(result.success).toBe(false)
  })

  it('rejects block with negative start_index', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 24, start_index: -1, rows: 1 }]
      }]
    })
    expect(result.success).toBe(false)
  })

  it('rejects block with zero rows', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 1,
        blocks: [{ type: 'rj45', count: 24, start_index: 0, rows: 0 }]
      }]
    })
    expect(result.success).toBe(false)
  })

  it('rejects unit with zero unit_number', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      units: [{
        unit_number: 0,
        blocks: [validBlock]
      }]
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid datasheet_url', () => {
    const result = createLayoutTemplateSchema.safeParse({
      name: 'Template',
      datasheet_url: 'not-a-url',
      units: [validUnit]
    })
    expect(result.success).toBe(false)
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
      expect(result.success, `row_layout "${row_layout}" should be valid`).toBe(true)
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
    expect(result.success).toBe(true)
  })
})

// ─── updateSettingsSchema ────────────────────────────────────────────────────

describe('updateSettingsSchema', () => {
  it('accepts valid settings update', () => {
    const result = updateSettingsSchema.safeParse({
      app_name: 'My Network'
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (all optional)', () => {
    const result = updateSettingsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects empty app_name', () => {
    const result = updateSettingsSchema.safeParse({ app_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects app_name longer than 100 chars', () => {
    const result = updateSettingsSchema.safeParse({ app_name: 'x'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts default_vlan in valid range', () => {
    const result = updateSettingsSchema.safeParse({ default_vlan: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects default_vlan out of range', () => {
    const r1 = updateSettingsSchema.safeParse({ default_vlan: 0 })
    const r2 = updateSettingsSchema.safeParse({ default_vlan: 4095 })
    expect(r1.success).toBe(false)
    expect(r2.success).toBe(false)
  })

  it('accepts nullable default_vlan', () => {
    const result = updateSettingsSchema.safeParse({ default_vlan: null })
    expect(result.success).toBe(true)
  })

  it('accepts valid default_port_status', () => {
    for (const status of ['up', 'down', 'disabled']) {
      const result = updateSettingsSchema.safeParse({ default_port_status: status })
      expect(result.success, `default_port_status "${status}" should be valid`).toBe(true)
    }
  })

  it('rejects invalid default_port_status', () => {
    const result = updateSettingsSchema.safeParse({ default_port_status: 'unknown' })
    expect(result.success).toBe(false)
  })

  it('accepts port_speeds array', () => {
    const result = updateSettingsSchema.safeParse({ port_speeds: ['1G', '10G'] })
    expect(result.success).toBe(true)
  })
})

// ─── updateSwitchSchema ─────────────────────────────────────────────────────

describe('updateSwitchSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateSwitchSchema.safeParse({}).success).toBe(true)
  })
  it('accepts partial name update', () => {
    expect(updateSwitchSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })
  it('accepts nullable model', () => {
    expect(updateSwitchSchema.safeParse({ model: null }).success).toBe(true)
  })
  it('accepts valid role enum', () => {
    for (const role of ['core', 'distribution', 'access', 'management']) {
      expect(updateSwitchSchema.safeParse({ role }).success, `role ${role} should be valid`).toBe(true)
    }
  })
  it('accepts nullable role', () => {
    expect(updateSwitchSchema.safeParse({ role: null }).success).toBe(true)
  })
  it('rejects invalid role', () => {
    expect(updateSwitchSchema.safeParse({ role: 'invalid' }).success).toBe(false)
  })
  it('accepts valid stack_size', () => {
    expect(updateSwitchSchema.safeParse({ stack_size: 4 }).success).toBe(true)
  })
  it('rejects stack_size > 8', () => {
    expect(updateSwitchSchema.safeParse({ stack_size: 9 }).success).toBe(false)
  })
  it('accepts nullable stack_size', () => {
    expect(updateSwitchSchema.safeParse({ stack_size: null }).success).toBe(true)
  })
  it('accepts is_favorite boolean', () => {
    expect(updateSwitchSchema.safeParse({ is_favorite: true }).success).toBe(true)
  })
  it('rejects name over 100 chars', () => {
    expect(updateSwitchSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
  it('accepts tags array', () => {
    expect(updateSwitchSchema.safeParse({ tags: ['a', 'b'] }).success).toBe(true)
  })
  it('rejects tags with more than 20 items', () => {
    expect(updateSwitchSchema.safeParse({ tags: Array(21).fill('tag') }).success).toBe(false)
  })
  it('accepts nullable tags', () => {
    expect(updateSwitchSchema.safeParse({ tags: null }).success).toBe(true)
  })
})

// ─── updateNetworkSchema ────────────────────────────────────────────────────

describe('updateNetworkSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateNetworkSchema.safeParse({}).success).toBe(true)
  })
  it('accepts partial name update', () => {
    expect(updateNetworkSchema.safeParse({ name: 'Updated' }).success).toBe(true)
  })
  it('accepts nullable gateway', () => {
    expect(updateNetworkSchema.safeParse({ gateway: null }).success).toBe(true)
  })
  it('accepts nullable vlan_id', () => {
    expect(updateNetworkSchema.safeParse({ vlan_id: null }).success).toBe(true)
  })
  it('accepts nullable description', () => {
    expect(updateNetworkSchema.safeParse({ description: null }).success).toBe(true)
  })
  it('accepts dns_servers array', () => {
    expect(updateNetworkSchema.safeParse({ dns_servers: ['8.8.8.8'] }).success).toBe(true)
  })
  it('accepts is_favorite', () => {
    expect(updateNetworkSchema.safeParse({ is_favorite: true }).success).toBe(true)
  })
  it('rejects empty name', () => {
    expect(updateNetworkSchema.safeParse({ name: '' }).success).toBe(false)
  })
  it('rejects name over 100 chars', () => {
    expect(updateNetworkSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
})

// ─── updateIpAllocationSchema ───────────────────────────────────────────────

describe('updateIpAllocationSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateIpAllocationSchema.safeParse({}).success).toBe(true)
  })
  it('accepts partial ip_address update', () => {
    expect(updateIpAllocationSchema.safeParse({ ip_address: '10.0.0.5' }).success).toBe(true)
  })
  it('accepts nullable hostname', () => {
    expect(updateIpAllocationSchema.safeParse({ hostname: null }).success).toBe(true)
  })
  it('accepts nullable mac_address', () => {
    expect(updateIpAllocationSchema.safeParse({ mac_address: null }).success).toBe(true)
  })
  it('accepts nullable device_type', () => {
    expect(updateIpAllocationSchema.safeParse({ device_type: null }).success).toBe(true)
  })
  it('accepts all device_type values including router and firewall', () => {
    for (const dt of ['server', 'switch', 'router', 'firewall', 'printer', 'phone', 'ap', 'camera', 'other']) {
      expect(updateIpAllocationSchema.safeParse({ device_type: dt }).success, `device_type ${dt} should be valid`).toBe(true)
    }
  })
  it('rejects invalid device_type', () => {
    expect(updateIpAllocationSchema.safeParse({ device_type: 'unknown' }).success).toBe(false)
  })
  it('accepts valid status', () => {
    for (const s of ['active', 'reserved', 'inactive']) {
      expect(updateIpAllocationSchema.safeParse({ status: s }).success, `status ${s} should be valid`).toBe(true)
    }
  })
  it('accepts nullable description', () => {
    expect(updateIpAllocationSchema.safeParse({ description: null }).success).toBe(true)
  })
})

// ─── updateIpRangeSchema ────────────────────────────────────────────────────

describe('updateIpRangeSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateIpRangeSchema.safeParse({}).success).toBe(true)
  })
  it('accepts partial start_ip update', () => {
    expect(updateIpRangeSchema.safeParse({ start_ip: '10.0.0.10' }).success).toBe(true)
  })
  it('accepts type update', () => {
    for (const t of ['static', 'dhcp', 'reserved']) {
      expect(updateIpRangeSchema.safeParse({ type: t }).success, `type ${t} should be valid`).toBe(true)
    }
  })
  it('rejects invalid type', () => {
    expect(updateIpRangeSchema.safeParse({ type: 'invalid' }).success).toBe(false)
  })
  it('accepts nullable description', () => {
    expect(updateIpRangeSchema.safeParse({ description: null }).success).toBe(true)
  })
})

// ─── updateSiteSchema ───────────────────────────────────────────────────────

describe('updateSiteSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(updateSiteSchema.safeParse({}).success).toBe(true)
  })
  it('accepts partial name update', () => {
    expect(updateSiteSchema.safeParse({ name: 'New Site' }).success).toBe(true)
  })
  it('accepts nullable description', () => {
    expect(updateSiteSchema.safeParse({ description: null }).success).toBe(true)
  })
  it('rejects empty name', () => {
    expect(updateSiteSchema.safeParse({ name: '' }).success).toBe(false)
  })
  it('rejects name over 100 chars', () => {
    expect(updateSiteSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
  it('rejects description over 500 chars', () => {
    expect(updateSiteSchema.safeParse({ description: 'a'.repeat(501) }).success).toBe(false)
  })
})
