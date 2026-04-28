type EntityType = 'switches' | 'vlans' | 'networks' | 'allocations' | 'templates'

const CSV_TEMPLATES: Record<EntityType, string> = {
  switches: 'name,model,manufacturer,serial_number,location,rack_position,management_ip,firmware_version,notes',
  vlans: 'vlan_id,name,description,status,routing_device,color',
  networks: 'name,vlan_id,subnet,gateway,dns_servers,description',
  allocations: 'network_id,ip_address,hostname,mac_address,device_type,description,status',
  templates: 'name,manufacturer,model,description'
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const type = query.type as EntityType

  if (!type || !CSV_TEMPLATES[type]) {
    throw createError({ statusCode: 400, message: 'Invalid entity type. Must be one of: switches, vlans, networks, allocations, templates' })
  }

  const csv = CSV_TEMPLATES[type]

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-${type}-template.csv"`)

  return csv
})
