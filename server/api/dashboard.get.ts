import { networkRepository } from '../storage/repositories/network-repository'
import { switchRepository } from '../storage/repositories/switch-repository'

export default defineEventHandler(async () => {
  const switches = await switchRepository.list()
  const networks = await networkRepository.list()

  const totalPorts = switches.reduce((sum, sw) => sum + sw.ports.length, 0)
  const usedPorts = switches.reduce((sum, sw) => sum + sw.ports.filter(p => p.status === 'active').length, 0)
  const assignedIps = networks.reduce((sum, n) => sum + n.allocations.length, 0)

  const topSubnets = [...networks]
    .map(net => ({ name: net.name, utilization: net.allocations.length }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5)

  return {
    switches: switches.length,
    activeSwitches: switches.filter(sw => sw.status === 'active').length,
    usedPorts,
    portUtilization: totalPorts ? Math.round((usedPorts / totalPorts) * 100) : 0,
    networks: networks.length,
    assignedIps,
    infrastructureUtilization: Math.min(100, Math.round((assignedIps / (networks.length * 254 || 1)) * 100)),
    topSubnets
  }
})
