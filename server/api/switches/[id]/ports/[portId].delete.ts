import { switchRepository } from '../../../../repositories/switchRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'

export default defineEventHandler(async (event) => {
  const portId = getRouterParam(event, 'portId')!

  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

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

  const port = await switchRepository.updatePort(sw.id, portId, resetData)
  return port
})
