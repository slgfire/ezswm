export function buildSidePanelPortPutOptions(body: Record<string, unknown>, siteId: string | undefined) {
  return {
    method: 'PUT' as const,
    body,
    query: siteId && siteId !== 'all' ? { siteId } : undefined
  }
}

const SCALAR_SAVE_KEYS = ['status', 'speed', 'description', 'mac_address', 'poe', 'helper_usage', 'helper_label', 'show_in_helper_list'] as const
const VLAN_SAVE_KEYS = ['port_mode', 'access_vlan', 'native_vlan', 'tagged_vlans'] as const
const CONNECTION_SAVE_KEYS = ['connected_device', 'connected_device_id', 'connected_port', 'connected_port_id', 'connected_allocation_id'] as const

const jsonDiffers = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b)

export type PortSaveDiff = {
  body: Record<string, unknown>
  /** Keys that are only present as unchanged dependencies of a VLAN change (must not be propagated to LAG members). */
  dependencyKeys: string[]
}

/**
 * Builds the minimal PUT body for a port save by comparing the settled baseline candidate with the
 * current candidate (both produced by the same candidate builder). Protocol fields such as
 * expected_updated_at are NOT part of either candidate and are added by the caller.
 * Scalars are sent only when changed; VLAN and connection fields are sent as atomic groups.
 * Returns null when nothing changed.
 */
export function buildPortSaveDiff(
  baseline: Record<string, unknown>,
  candidate: Record<string, unknown>,
  options: { baselineSignature?: string, currentSignature?: string } = {}
): PortSaveDiff | null {
  const body: Record<string, unknown> = {}
  const dependencyKeys: string[] = []

  for (const key of SCALAR_SAVE_KEYS) {
    if (candidate[key] !== undefined && jsonDiffers(baseline[key], candidate[key])) body[key] = candidate[key]
  }

  const vlanChanged = VLAN_SAVE_KEYS.some(key => candidate[key] !== undefined && jsonDiffers(baseline[key], candidate[key]))
  const connectionChanged = CONNECTION_SAVE_KEYS.some(key => candidate[key] !== undefined && jsonDiffers(baseline[key], candidate[key]))
    || (options.baselineSignature !== undefined && options.currentSignature !== undefined && options.baselineSignature !== options.currentSignature)
  const targetSwitch = typeof candidate.connected_device_id === 'string' && candidate.connected_device_id !== ''

  if (vlanChanged || (connectionChanged && targetSwitch)) {
    for (const key of VLAN_SAVE_KEYS) {
      if (candidate[key] !== undefined) body[key] = candidate[key]
    }
  }

  if (connectionChanged) {
    for (const key of CONNECTION_SAVE_KEYS) {
      if (candidate[key] !== undefined) body[key] = candidate[key]
    }
  } else if (vlanChanged && targetSwitch) {
    // The server needs the link to sync VLANs to the selected switch; the link itself is unchanged.
    body.connected_device_id = candidate.connected_device_id
    body.connected_port_id = candidate.connected_port_id
    dependencyKeys.push('connected_device_id', 'connected_port_id')
  }

  if (targetSwitch && (vlanChanged || connectionChanged)) body.add_vlans_to_target_switch = true

  return Object.keys(body).length ? { body, dependencyKeys } : null
}

export function buildLagSyncFields(body: Record<string, unknown>): Record<string, unknown> {
  const syncFields: Record<string, unknown> = {
    status: body.status,
    speed: body.speed,
    port_mode: body.port_mode,
    access_vlan: body.access_vlan,
    native_vlan: body.native_vlan,
    tagged_vlans: body.tagged_vlans,
    connected_device: body.connected_device,
    connected_device_id: body.connected_device_id,
    connected_allocation_id: body.connected_allocation_id,
    helper_usage: body.helper_usage,
    helper_label: body.helper_label,
    show_in_helper_list: body.show_in_helper_list,
  }

  for (const key of Object.keys(syncFields)) {
    if (syncFields[key] === undefined) delete syncFields[key]
  }

  if (body.add_vlans_to_target_switch) {
    syncFields.add_vlans_to_target_switch = true
  }

  return syncFields
}

type CopySourceConnection = {
  connected_device?: string | null
  connected_port?: string | null
  connected_device_id?: string | null
  connected_allocation_id?: string | null
}

type CopyConnectionState = {
  connectionMode: 'freetext'
  selectedSwitchId: ''
  selectedPortId: ''
  selectedAllocationId: ''
  connected_device: string
  connected_port: string
}

export function getManualCopyConnection(source: CopySourceConnection): { connected_device: string, connected_port: string } | null {
  if (!source.connected_device || source.connected_device_id || source.connected_allocation_id) {
    return null
  }

  return {
    connected_device: source.connected_device,
    connected_port: source.connected_port || ''
  }
}

export function buildCopyConnectionState(source: CopySourceConnection): CopyConnectionState {
  const manualConnection = getManualCopyConnection(source)
  return {
    connectionMode: 'freetext',
    selectedSwitchId: '',
    selectedPortId: '',
    selectedAllocationId: '',
    connected_device: manualConnection?.connected_device || '',
    connected_port: manualConnection?.connected_port || ''
  }
}
