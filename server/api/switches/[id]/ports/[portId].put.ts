import { switchRepository } from '../../../../repositories/switchRepository'
import { vlanRepository } from '../../../../repositories/vlanRepository'
import { updatePortSchema } from '../../../../validators/switchSchemas'
import { activityRepository } from '../../../../repositories/activityRepository'
import type { Port } from '../../../../../types/port'

export default defineEventHandler(async (event) => {
  const switchId = event.context.params?.id
  const portId = event.context.params?.portId

  if (!switchId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing switch ID' })
  }

  if (!portId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing port ID' })
  }

  const existing = await switchRepository.getById(switchId)

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  }

  // Get old port state before update
  const oldPort = existing.ports.find(p => p.id === portId)

  const body = await readBody(event)
  const parsed = updatePortSchema.parse(body)

  // Extract override/concurrency fields before passing to port update
  const addVlansToTargetSwitch = parsed.add_vlans_to_target_switch
  const expectedUpdatedAt = parsed.expected_updated_at
  delete (parsed as Record<string, unknown>).add_vlans_to_target_switch
  delete (parsed as Record<string, unknown>).expected_updated_at

  // Build changes diff BEFORE normalization — so "clear to automatic" appears in activity as null
  // Build changes diff — only log fields that actually changed
  const changes: Record<string, unknown> = {}
  const previousState: Record<string, unknown> = {}
  if (oldPort) {
    const fields = ['status', 'speed', 'port_mode', 'native_vlan', 'access_vlan', 'tagged_vlans', 'connected_device', 'connected_port', 'description', 'poe', 'connected_allocation_id', 'helper_usage', 'helper_label', 'show_in_helper_list'] as const
    for (const field of fields) {
      const oldVal = oldPort[field]
      const newVal = (parsed as Record<string, unknown>)[field]
      if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[field] = newVal
        previousState[field] = oldVal
      }
    }
  }

  // Normalize null → undefined for clearable helper fields (so they are omitted from stored JSON)
  if (parsed.helper_usage === null) parsed.helper_usage = undefined
  if (parsed.helper_label === null) parsed.helper_label = undefined

  // Get site VLANs for validation
  const siteVlans = vlanRepository.list().filter(v => v.site_id === existing.site_id)
  const siteVlanIds = siteVlans.map(v => v.vlan_id)

  const result = switchRepository.applyPortVlanUpdate(
    switchId,
    portId,
    parsed as Partial<Omit<Port, 'id' | 'unit' | 'index'>>,
    {
      expectedUpdatedAt,
      siteVlanIds
    }
  )

  // If override is active and a target switch is connected, add VLANs to the target switch
  let vlansAddedToTargetSwitch: number[] = []
  const connectedDeviceId = (parsed as Record<string, unknown>).connected_device_id as string | undefined
  if (addVlansToTargetSwitch && connectedDeviceId && connectedDeviceId !== switchId) {
    // Collect all VLAN IDs from the port
    const portVlans: number[] = []
    if ((parsed as Record<string, unknown>).access_vlan) portVlans.push((parsed as Record<string, unknown>).access_vlan as number)
    if ((parsed as Record<string, unknown>).native_vlan) portVlans.push((parsed as Record<string, unknown>).native_vlan as number)
    if ((parsed as Record<string, unknown>).tagged_vlans) portVlans.push(...((parsed as Record<string, unknown>).tagged_vlans as number[]))

    if (portVlans.length > 0) {
      // Verify VLANs exist in site before adding to target
      const validVlans = portVlans.filter(v => siteVlanIds.includes(v))
      if (validVlans.length > 0) {
        const targetResult = switchRepository.addVlansToSwitch(connectedDeviceId, validVlans)
        vlansAddedToTargetSwitch = targetResult.addedVlans
      }
    }
  }

  const metadata: Record<string, unknown> = {
    port_id: portId,
    port_label: oldPort?.label || portId,
  }
  if (result.vlansAddedToSwitch.length > 0) {
    metadata.vlans_added_to_switch = result.vlansAddedToSwitch
  }
  if (vlansAddedToTargetSwitch.length > 0) {
    metadata.vlans_added_to_target_switch = vlansAddedToTargetSwitch
  }

  await activityRepository.log({
    user_id: event.context.auth?.userId,
    action: 'update_port',
    entity_type: 'switch',
    entity_id: switchId,
    entity_name: existing.name,
    metadata,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    previous_state: Object.keys(previousState).length > 0 ? previousState : undefined,
  })

  return {
    ...result.port,
    updated_at: result.updatedAt,
    vlans_added_to_switch: result.vlansAddedToSwitch.length > 0 ? result.vlansAddedToSwitch : undefined,
    vlans_added_to_target_switch: vlansAddedToTargetSwitch.length > 0 ? vlansAddedToTargetSwitch : undefined
  }
})
