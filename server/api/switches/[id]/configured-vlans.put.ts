import { switchRepository } from '../../../repositories/switchRepository'
import { vlanRepository } from '../../../repositories/vlanRepository'
import { activityRepository } from '../../../repositories/activityRepository'
import { configuredVlansSchema } from '../../../validators/switchSchemas'
import type { Port } from '../../../../types/port'

function resolvePortLabel(port: Port): string {
  return port.label || `${port.unit}/${port.index}`
}

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  if (!switchId) throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })

  const sw = switchRepository.getById(switchId)
  if (!sw) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

  const body = await readBody(event)
  const parsed = configuredVlansSchema.parse(body)

  // Concurrency check
  if (parsed.expected_updated_at && sw.updated_at !== parsed.expected_updated_at) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Switch was modified since page load',
      data: { current_updated_at: sw.updated_at }
    })
  }

  const siteVlans = vlanRepository.list().filter(v => v.site_id === sw.site_id)
  const siteVlanIds = siteVlans.map(v => v.vlan_id)

  if (parsed.action === 'add') {
    // All-or-nothing: validate all vlan_ids first
    const invalidIds = parsed.vlan_ids.filter(id => !siteVlanIds.includes(id))
    if (invalidIds.length > 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'VLANs do not exist in this site',
        data: { invalid_vlan_ids: invalidIds }
      })
    }

    const current = sw.configured_vlans || []
    const merged = [...new Set([...current, ...parsed.vlan_ids])]
      .filter(v => v >= 1 && v <= 4094)
      .sort((a, b) => a - b)

    switchRepository.update(switchId, { configured_vlans: merged } as Partial<import('~~/types').Switch>)
    const updated = switchRepository.getById(switchId)!

    await activityRepository.log({
      user_id: event.context.auth?.userId,
      action: 'add_configured_vlans',
      entity_type: 'switch',
      entity_id: switchId,
      entity_name: sw.name,
      metadata: { vlan_ids: parsed.vlan_ids }
    })

    return { configured_vlans: updated.configured_vlans, updated_at: updated.updated_at }
  }

  if (parsed.action === 'remove') {
    const vlanId = parsed.vlan_id

    // Check if VLAN is used on any port (field-level analysis)
    type AffectedEntry = { port_id: string; port_label: string; field: string }
    const affectedPorts: AffectedEntry[] = []
    const removableAutomatically: { port_id: string; field: string }[] = []
    const requiresDecision: { port_id: string; field: string }[] = []

    for (const port of sw.ports) {
      if (port.access_vlan === vlanId) {
        affectedPorts.push({ port_id: port.id, port_label: resolvePortLabel(port), field: 'access_vlan' })
        requiresDecision.push({ port_id: port.id, field: 'access_vlan' })
      }
      if (port.native_vlan === vlanId) {
        affectedPorts.push({ port_id: port.id, port_label: resolvePortLabel(port), field: 'native_vlan' })
        requiresDecision.push({ port_id: port.id, field: 'native_vlan' })
      }
      if (port.tagged_vlans?.includes(vlanId)) {
        affectedPorts.push({ port_id: port.id, port_label: resolvePortLabel(port), field: 'tagged_vlans' })
        removableAutomatically.push({ port_id: port.id, field: 'tagged_vlans' })
      }
    }

    if (requiresDecision.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: `VLAN ${vlanId} is still in use on ${affectedPorts.length} ports`,
        data: {
          current_updated_at: sw.updated_at,
          affected_ports: affectedPorts,
          removable_automatically: removableAutomatically,
          requires_decision: requiresDecision
        }
      })
    }

    // No requires_decision — safe to remove (auto-remove from tagged_vlans)
    const result = switchRepository.applyConfiguredVlansRemoval(switchId, vlanId, {
      expectedUpdatedAt: parsed.expected_updated_at
    })

    await activityRepository.log({
      user_id: event.context.auth?.userId,
      action: 'remove_configured_vlans',
      entity_type: 'switch',
      entity_id: switchId,
      entity_name: sw.name,
      metadata: { vlan_ids: [vlanId], ports_updated: result.portsUpdated }
    })

    const updated = switchRepository.getById(switchId)!
    return { configured_vlans: updated.configured_vlans, updated_at: result.updatedAt }
  }

  if (parsed.action === 'remove_confirmed') {
    const vlanId = parsed.vlan_id

    // Re-compute current affected ports for completeness check
    const currentRequiresDecision: { port_id: string; field: string }[] = []
    for (const port of sw.ports) {
      if (port.access_vlan === vlanId) currentRequiresDecision.push({ port_id: port.id, field: 'access_vlan' })
      if (port.native_vlan === vlanId) currentRequiresDecision.push({ port_id: port.id, field: 'native_vlan' })
    }

    // Completeness check: every requires_decision must be in port_cleanup
    const cleanupDecisions = (parsed.port_cleanup || []).filter(c => c.field !== 'tagged_vlans')
    for (const req of currentRequiresDecision) {
      const found = cleanupDecisions.find(c => c.port_id === req.port_id && c.field === req.field)
      if (!found) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Port cleanup does not match current state. Please reload.',
          data: { current_updated_at: sw.updated_at }
        })
      }
    }

    // Validate replacement VLANs against post-remove state
    const postRemoveConfigured = (sw.configured_vlans || []).filter(v => v !== vlanId)
    for (const cleanup of parsed.port_cleanup) {
      if (cleanup.new_value && typeof cleanup.new_value === 'number') {
        if (!postRemoveConfigured.includes(cleanup.new_value)) {
          throw createError({
            statusCode: 422,
            statusMessage: `Replacement VLAN ${cleanup.new_value} is not in configured_vlans after removal`
          })
        }
        if (!siteVlanIds.includes(cleanup.new_value)) {
          throw createError({
            statusCode: 404,
            statusMessage: `Replacement VLAN ${cleanup.new_value} does not exist in this site`
          })
        }
      }
    }

    const result = switchRepository.applyConfiguredVlansRemoval(switchId, vlanId, {
      expectedUpdatedAt: parsed.expected_updated_at,
      portCleanup: parsed.port_cleanup
    })

    await activityRepository.log({
      user_id: event.context.auth?.userId,
      action: 'remove_configured_vlans',
      entity_type: 'switch',
      entity_id: switchId,
      entity_name: sw.name,
      metadata: {
        vlan_ids: [vlanId],
        ports_updated: result.portsUpdated,
        cleanup: parsed.port_cleanup
      }
    })

    const updated = switchRepository.getById(switchId)!
    return { configured_vlans: updated.configured_vlans, updated_at: result.updatedAt, ports_updated: result.portsUpdated }
  }
})
