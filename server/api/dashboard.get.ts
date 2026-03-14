import { repositories } from '../repositories'

export default defineEventHandler(async () => {
  const [switches, ports, networks, allocations] = await Promise.all([
    repositories.switches.findAll(),
    repositories.ports.findAll(),
    repositories.networks.findAll(),
    repositories.allocations.findAll()
  ])

  const activeSwitches = switches.filter(sw => sw.status === 'active').length
  const usedPorts = ports.filter(port => port.status === 'up').length
  const portUtilization = ports.length ? Math.round((usedPorts / ports.length) * 100) : 0

  const subnetUsage = networks.map(network => {
    const used = allocations.filter(a => a.networkId === network.id).length
    const capacity = Math.max(2, 2 ** (32 - network.prefix) - 2)
    const percent = Math.round((used / capacity) * 100)
    return { networkId: network.id, name: network.name, used, capacity, percent }
  }).sort((a, b) => b.percent - a.percent).slice(0, 5)

  return {
    switches: switches.length,
    activeSwitches,
    usedPorts,
    portUtilization,
    networks: networks.length,
    assignedIps: allocations.length,
    subnetUsage
  }
})
