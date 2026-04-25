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

  // If override is active and a target switch is connected, sync VLANs to the target
  let vlansAddedToTargetSwitch: number[] = []
  const connectedDeviceId = (parsed as Record<string, unknown>).connected_device_id as string | undefined
  const connectedPortId = (parsed as Record<string, unknown>).connected_port_id as string | undefined
  if (addVlansToTargetSwitch && connectedDeviceId && connectedDeviceId !== switchId) {
    // Collect VLAN config from the saved port
    const portMode = (parsed as Record<string, unknown>).port_mode as string | undefined
    const accessVlan = (parsed as Record<string, unknown>).access_vlan as number | null | undefined
    const nativeVlan = (parsed as Record<string, unknown>).native_vlan as number | null | undefined
    const taggedVlans = (parsed as Record<string, unknown>).tagged_vlans as number[] | undefined

    const portVlans: number[] = []
    if (accessVlan) portVlans.push(accessVlan)
    if (nativeVlan) portVlans.push(nativeVlan)
    if (taggedVlans) portVlans.push(...taggedVlans)

    if (portVlans.length > 0) {
      // 1. Add VLANs to target switch's configured_vlans
      const validVlans = portVlans.filter(v => siteVlanIds.includes(v))
      if (validVlans.length > 0) {
        const targetResult = switchRepository.addVlansToSwitch(connectedDeviceId, validVlans)
        vlansAddedToTargetSwitch = targetResult.addedVlans
      }

      // 2. Sync VLAN config + back-link to the connected port on the target switch
      if (connectedPortId && portMode) {
        const targetPortUpdate: Partial<Omit<Port, 'id' | 'unit' | 'index'>> = {
          port_mode: portMode as Port['port_mode'],
          // Set bidirectional connection back to source
          connected_device: existing.name,
          connected_device_id: switchId,
          connected_port: oldPort?.label || portId,
          connected_port_id: portId
        }
        if (portMode === 'access') {
          targetPortUpdate.access_vlan = accessVlan ?? null
          targetPortUpdate.native_vlan = null
          targetPortUpdate.tagged_vlans = []
        } else if (portMode === 'trunk') {
          targetPortUpdate.access_vlan = null
          targetPortUpdate.native_vlan = nativeVlan ?? null
          targetPortUpdate.tagged_vlans = taggedVlans ?? []
        }
        try {
          switchRepository.applyPortVlanUpdate(connectedDeviceId, connectedPortId, targetPortUpdate, { siteVlanIds })
        } catch {
          // Target port update is best-effort — don't fail the main save
        }
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
