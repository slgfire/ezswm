import { dataStore } from '../storage/data-store'

export default defineEventHandler(async () => {
  const data = await dataStore.read()
  const usedPorts = data.switches.reduce((sum, sw) => sum + sw.ports.filter((port) => port.status === 'up').length, 0)
  const totalPorts = data.switches.reduce((sum, sw) => sum + sw.ports.length, 0)

  return {
    switches: data.switches.length,
    activeSwitches: data.switches.filter((sw) => sw.status === 'active').length,
    usedPorts,
    portUtilization: totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0,
    networks: data.networks.length,
    assignedIps: data.ipAllocations.length,
    topUtilizedSubnets: data.networks.slice(0, 5).map((network) => ({
      networkId: network.id,
      name: network.name,
      subnet: `${network.subnet}/${network.prefix}`,
      allocations: data.ipAllocations.filter((item) => item.networkId === network.id).length
    }))
  }
})
