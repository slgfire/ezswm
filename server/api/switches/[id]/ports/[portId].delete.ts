import { switchRepository } from '../../../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const switchId = getRouterParam(event, 'id')!
  const portId = getRouterParam(event, 'portId')!

  // Reset port to defaults — clears all user-set fields, removes bidirectional links
  const resetData = {
    status: 'down' as const,
    speed: undefined,
    port_mode: undefined,
    access_vlan: undefined,
    native_vlan: undefined,
    tagged_vlans: [],
    connected_device: undefined,
    connected_device_id: undefined,
    connected_port_id: undefined,
    connected_port: undefined,
    connected_allocation_id: undefined,
    description: undefined,
    mac_address: undefined
  }

  const port = switchRepository.updatePort(switchId, portId, resetData)
  return port
})
