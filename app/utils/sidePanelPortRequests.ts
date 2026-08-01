export function buildSidePanelPortPutOptions(body: Record<string, unknown>, siteId: string | undefined) {
  return {
    method: 'PUT' as const,
    body,
    query: siteId && siteId !== 'all' ? { siteId } : undefined
  }
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
    connected_port: body.connected_port,
    connected_device_id: body.connected_device_id,
    connected_allocation_id: body.connected_allocation_id,
    helper_usage: body.helper_usage,
    helper_label: body.helper_label,
    show_in_helper_list: body.show_in_helper_list,
  }

  if (body.add_vlans_to_target_switch) {
    syncFields.add_vlans_to_target_switch = true
  }

  if (body.connected_allocation_id) {
    syncFields.connected_port = null
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
