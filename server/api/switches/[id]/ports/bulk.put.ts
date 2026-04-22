import { switchRepository } from '../../../../repositories/switchRepository'
import { vlanRepository } from '../../../../repositories/vlanRepository'
import { bulkUpdatePortsSchema } from '../../../../validators/switchSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import type { Port } from '../../../../../types/port'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id

  if (!switchId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  const sw = await switchRepository.getById(switchId)
  if (!sw) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  const body = await readBody(event)
  const parsed = bulkUpdatePortsSchema.parse(body)

  const addVlansToSwitch = parsed.add_vlans_to_switch || false
  const expectedUpdatedAt = parsed.expected_updated_at

  // Concurrency check once at the start
  if (expectedUpdatedAt && sw.updated_at !== expectedUpdatedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Switch was modified since page load',
      data: { current_updated_at: sw.updated_at }
    })
  }

  // Validate all port IDs exist
  for (const portId of parsed.port_ids) {
    if (!sw.ports.find(p => p.id === portId)) {
      throw createError({ statusCode: 404, statusMessage: `Port ${portId} not found` })
    }
  }

  // Collect all VLAN IDs from the request
  const requestedVlans: number[] = []
  if (parsed.updates.access_vlan) requestedVlans.push(parsed.updates.access_vlan)
  if (parsed.updates.native_vlan) requestedVlans.push(parsed.updates.native_vlan)
  if (parsed.updates.tagged_vlans) requestedVlans.push(...parsed.updates.tagged_vlans)

  const configuredVlans = sw.configured_vlans || []
  const vlansToAdd: number[] = []

  // All-or-nothing VLAN validation
  for (const vlanId of requestedVlans) {
    if (!configuredVlans.includes(vlanId)) {
      if (!addVlansToSwitch) {
        throw createError({
          statusCode: 422,
          statusMessage: `VLAN ${vlanId} is not configured on this switch`
        })
      }
      if (!vlansToAdd.includes(vlanId)) vlansToAdd.push(vlanId)
    }
  }

  // Verify all VLANs exist as site entities
  if (requestedVlans.length > 0) {
    const siteVlans = vlanRepository.list().filter(v => v.site_id === sw.site_id)
    const siteVlanIds = siteVlans.map(v => v.vlan_id)
    for (const vlanId of requestedVlans) {
      if (!siteVlanIds.includes(vlanId)) {
        throw createError({
          statusCode: 404,
          statusMessage: `VLAN ${vlanId} does not exist in this site`
        })
      }
    }
  }

  // Normalize null → undefined for clearable helper fields
  if (parsed.updates.helper_usage === null) parsed.updates.helper_usage = undefined

  // All validation passed — single atomic write
  const updatedPorts = switchRepository.bulkUpdatePorts(switchId, parsed.port_ids, parsed.updates as Partial<Omit<Port, 'id' | 'unit' | 'index'>>)

  // If override, also update configured_vlans
  if (vlansToAdd.length > 0) {
    const currentSw = switchRepository.getById(switchId)!
    const merged = [...new Set([...(currentSw.configured_vlans || []), ...vlansToAdd])]
      .filter(v => v >= 1 && v <= 4094)
      .sort((a, b) => a - b)
    switchRepository.update(switchId, { configured_vlans: merged } as any)
  }

  const updatedSw = switchRepository.getById(switchId)!

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'bulk_update_ports',
    entity_type: 'switch',
    entity_id: switchId,
    entity_name: sw.name,
    metadata: {
      port_ids: parsed.port_ids,
      updates: parsed.updates,
      ...(vlansToAdd.length > 0 ? { vlans_added_to_switch: vlansToAdd } : {})
    }
  })

  return {
    updated_ports: updatedPorts,
    updated_at: updatedSw.updated_at,
    ...(vlansToAdd.length > 0 ? { vlans_added_to_switch: vlansToAdd } : {})
  }
})
