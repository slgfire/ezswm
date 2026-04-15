const TEMPLATES: Record<string, Record<string, unknown>[]> = {
  switches: [{ name: 'Switch-01', model: 'Model', manufacturer: 'Vendor', location: 'Room 1', management_ip: '10.0.0.1' }],
  vlans: [{ vlan_id: 100, name: 'Server-VLAN', description: 'Server network', status: 'active', color: '#E74C3C' }],
  networks: [{ name: 'Server-Net', subnet: '10.0.1.0/24', gateway: '10.0.1.1', dns_servers: ['8.8.8.8'], description: 'Server network' }],
  'ip-allocations': [{ ip_address: '10.0.1.10', hostname: 'server-01', device_type: 'server', status: 'active' }]
}

export default defineEventHandler((event) => {
  const entity = event.context.params?.entity
  if (!entity || !TEMPLATES[entity]) {
    throw createError({ statusCode: 400, message: `Unknown entity: ${entity}. Valid: ${Object.keys(TEMPLATES).join(', ')}` })
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="${entity}-template.json"`)

  return TEMPLATES[entity]
})
