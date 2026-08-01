import { switchRepository } from '../../../../repositories/switchRepository'
import { vlanRepository } from '../../../../repositories/vlanRepository'
import { bulkUpdatePortsSchema } from '../../../../validators/switchSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'
import type { Port } from '../../../../../types/port'

export default defineEventHandler(async (event) => {
  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)
  const switchId = sw.id

  const body = await readBody(event)
  const parsed = bulkUpdatePortsSchema.parse(body)

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

  // A normal bulk edit must not split an existing LAG. LAG VLAN applies must
  // explicitly identify the one LAG all targets belong to.
  const targetPorts = sw.ports.filter(p => parsed.port_ids.includes(p.id))
  const lagMembers = parsed.lag_group_id ? sw.ports.filter(p => p.lag_group_id === parsed.lag_group_id) : []
  const shouldEnforceCopyLagGuard = parsed.apply_after_copy_prefill === true
  if (shouldEnforceCopyLagGuard && targetPorts.some(p => p.lag_group_id != null)) {
    throw createError({ statusCode: 409, statusMessage: 'All target ports must belong to the specified LAG' })
  }
  if (parsed.lag_group_id
    ? targetPorts.length !== lagMembers.length || targetPorts.some(p => p.lag_group_id !== parsed.lag_group_id) || lagMembers.some(p => !parsed.port_ids.includes(p.id))
    : targetPorts.some(p => p.lag_group_id != null)) {
    throw createError({ statusCode: 409, statusMessage: 'All target ports must belong to the specified LAG' })
  }

  // Collect all VLAN IDs from the request
  const requestedVlans: number[] = []
  if (parsed.updates.access_vlan !== undefined && parsed.updates.access_vlan !== null) requestedVlans.push(parsed.updates.access_vlan)
  if (parsed.updates.native_vlan !== undefined && parsed.updates.native_vlan !== null) requestedVlans.push(parsed.updates.native_vlan)
  if (parsed.updates.tagged_vlans) requestedVlans.push(...parsed.updates.tagged_vlans)

  // Verify all VLANs exist as site entities
  if (requestedVlans.length > 0) {
    const siteVlans = (await vlanRepository.list()).filter(v => v.site_id === sw.site_id)
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

  // Auto-add any unconfigured VLANs to this switch
  const configuredVlans = sw.configured_vlans || []
  const vlansToAdd: number[] = []
  for (const vlanId of requestedVlans) {
    if (!configuredVlans.includes(vlanId) && !vlansToAdd.includes(vlanId)) {
      vlansToAdd.push(vlanId)
    }
  }

  // Normalize null → undefined for clearable helper fields
  if (parsed.updates.helper_usage === null) parsed.updates.helper_usage = undefined

  // All validation passed — single atomic write
  const updatedPorts = await switchRepository.bulkUpdatePorts(switchId, parsed.port_ids, parsed.updates as Partial<Omit<Port, 'id' | 'unit' | 'index'>>)

  // If override, also update configured_vlans
  if (vlansToAdd.length > 0) {
    const currentSw = (await switchRepository.getById(switchId))!
    const merged = [...new Set([...(currentSw.configured_vlans || []), ...vlansToAdd])]
      .filter(v => v >= 1 && v <= 4094)
      .sort((a, b) => a - b)
    await switchRepository.update(switchId, { configured_vlans: merged } as Partial<import('~~/types').Switch>)
  }

  const updatedSw = (await switchRepository.getById(switchId))!

  await activityRepository.log({
    user_id: event.context.auth.userId,
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
