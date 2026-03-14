import { allocationRepository, networkRepository, switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(async () => {
  const switches = await switchRepository.getAll()
  const networks = await networkRepository.getAll()
  const allocations = await allocationRepository.getAll()
  const totalPorts = switches.reduce((acc, sw) => acc + sw.ports.length, 0)
  const usedPorts = switches.reduce((acc, sw) => acc + sw.ports.filter(p => p.status === 'up').length, 0)
  const subnetUtilization = networks.slice(0, 5).map(n => ({
    name: n.name,
    utilization: allocations.filter(a => a.networkId === n.id).length
  }))

  return {
    switches: switches.length,
    activeSwitches: switches.filter(sw => sw.status === 'active').length,
    usedPorts,
    portUtilization: totalPorts ? Math.round((usedPorts / totalPorts) * 100) : 0,
    networks: networks.length,
    assignedIps: allocations.length,
    infrastructureUtilization: 68,
    topUtilizedSubnets: subnetUtilization
  }
})
