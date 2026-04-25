import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { Switch } from '../../types/switch'
import type { Port, PortSpeed } from '../../types/port'
import type { IPAllocation } from '../../types/ipAllocation'
import { layoutTemplateRepository } from './layoutTemplateRepository'
import { isValidIPv4, isIPInSubnet } from '../utils/ipv4'
import { incrementMemberLabel } from '../utils/deviceLibrary'

const FILE_NAME = 'switches.json'
const ALLOC_FILE_NAME = 'ipAllocations.json'
const NETWORK_FILE_NAME = 'networks.json'

/**
 * Auto-create or update an IP allocation when a switch gets a management_ip.
 * Finds the matching network by CIDR and upserts the allocation.
 * Silently skips if no matching network is found.
 */
function syncManagementIpAllocation(switchId: string, switchName: string, newIp: string | undefined, oldIp?: string): void {
  try {
    const allocations = readJson<IPAllocation[]>(ALLOC_FILE_NAME)
    const networks = readJson<{ id: string; subnet: string }[]>(NETWORK_FILE_NAME)

    // Remove old allocation if IP changed or removed
    if (oldIp && oldIp !== newIp) {
      const oldIndex = allocations.findIndex(a => a.ip_address === oldIp && a.description === `Management IP for switch: ${switchName}`)
      if (oldIndex === -1) {
        // Also try matching by switch ID in description (in case switch was renamed)
        const altIndex = allocations.findIndex(a => a.ip_address === oldIp && a.description?.startsWith('Management IP for switch:'))
        if (altIndex !== -1) {
          allocations.splice(altIndex, 1)
        }
      } else {
        allocations.splice(oldIndex, 1)
      }
    }

    // Create new allocation if IP is set
    if (newIp && isValidIPv4(newIp)) {
      // Find matching network
      const matchingNetwork = networks.find(n => isIPInSubnet(newIp, n.subnet))
      if (!matchingNetwork) {
        // No matching network - write back any removals and return
        if (oldIp && oldIp !== newIp) {
          writeJson(ALLOC_FILE_NAME, allocations)
        }
        return
      }

      // Check if this IP is already allocated
      const existingAlloc = allocations.find(a => a.ip_address === newIp)
      if (existingAlloc) {
        // Update existing allocation to reflect this switch
        existingAlloc.hostname = switchName
        existingAlloc.device_type = 'switch'
        existingAlloc.description = `Management IP for switch: ${switchName}`
        existingAlloc.updated_at = new Date().toISOString()
      } else {
        // Create new allocation
        const now = new Date().toISOString()
        allocations.push({
          id: nanoid(),
          network_id: matchingNetwork.id,
          ip_address: newIp,
          hostname: switchName,
          device_type: 'switch',
          description: `Management IP for switch: ${switchName}`,
          status: 'active',
          created_at: now,
          updated_at: now
        })
      }
    }

    writeJson(ALLOC_FILE_NAME, allocations)
  } catch {
    // Silently ignore errors - management IP allocation is best-effort
  }
}

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

function generatePortsFromTemplate(templateId: string, stackSize: number = 1): Port[] {
  const template = layoutTemplateRepository.getById(templateId)
  if (!template) return []

  const ports: Port[] = []
  const baseUnits = template.units

  for (let member = 1; member <= stackSize; member++) {
    for (const unit of baseUnits) {
      const unitOffset = (member - 1) * baseUnits.length
      for (const block of unit.blocks) {
        const memberLabel = block.label
          ? incrementMemberLabel(block.label, member)
          : block.label

        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          ports.push({
            id: nanoid(),
            unit: unit.unit_number + unitOffset,
            index: portIndex,
            label: generatePortLabel(memberLabel, unit.unit_number + unitOffset, portIndex),
            type: block.type,
            speed: block.default_speed as PortSpeed | undefined,
            status: 'down',
            tagged_vlans: [],
            ...(block.poe ? { poe: { ...block.poe } } : {}),
          })
        }
      }
    }
  }
  return ports
}

/** Deduplicate, sort, and filter to valid VLAN IDs (1-4094) */
function normalizeConfiguredVlans(vlans: number[]): number[] {
  return [...new Set(vlans)]
    .filter(v => Number.isInteger(v) && v >= 1 && v <= 4094)
    .sort((a, b) => a - b)
}

export const switchRepository = {
  list(): Switch[] {
    const switches = readJson<Switch[]>(FILE_NAME)
    return switches.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
  },

  updateSortOrder(order: string[]): void {
    const switches = readJson<Switch[]>(FILE_NAME)
    for (let i = 0; i < order.length; i++) {
      const sw = switches.find(s => s.id === order[i])
      if (sw) sw.sort_order = i
    }
    writeJson(FILE_NAME, switches)
  },

  getById(id: string): Switch | null {
    const switches = this.list()
    return switches.find(s => s.id === id) || null
  },

  create(data: Omit<Switch, 'id' | 'ports' | 'created_at' | 'updated_at' | 'is_favorite'>): Switch {
    const switches = this.list()

    const siteSwitches = switches.filter(s => s.site_id === data.site_id)
    if (siteSwitches.some(s => s.name === data.name)) {
      throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists in this site` })
    }

    const ports = data.layout_template_id
      ? generatePortsFromTemplate(data.layout_template_id, data.stack_size ?? 1)
      : []

    const now = new Date().toISOString()
    const sw: Switch = {
      id: nanoid(),
      ...data,
      ports,
      configured_vlans: [],
      is_favorite: false,
      created_at: now,
      updated_at: now
    }

    switches.push(sw)
    writeJson(FILE_NAME, switches)

    // Auto-create IP allocation for management IP
    if (sw.management_ip) {
      syncManagementIpAllocation(sw.id, sw.name, sw.management_ip)
    }

    return sw
  },

  update(id: string, data: Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>): Switch {
    const switches = this.list()
    const index = switches.findIndex(s => s.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const current = switches[index]!

    if (data.name && data.name !== current.name) {
      const siteId = current.site_id
      if (switches.some(s => s.site_id === siteId && s.name === data.name)) {
        throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists in this site` })
      }
    }

    // Regenerate ports if layout_template_id or stack_size changed
    let ports = current.ports
    if (
      (data.layout_template_id && data.layout_template_id !== current.layout_template_id) ||
      (data.stack_size !== undefined && data.stack_size !== current.stack_size)
    ) {
      const templateId = data.layout_template_id ?? current.layout_template_id
      const stackSize = data.stack_size ?? current.stack_size ?? 1
      if (templateId) {
        ports = generatePortsFromTemplate(templateId, stackSize)
      }
    }

    const oldManagementIp = current.management_ip
    const oldName = current.name

    switches[index] = {
      ...current,
      ...data,
      ports,
      updated_at: new Date().toISOString()
    }

    writeJson(FILE_NAME, switches)

    // Auto-update IP allocation for management IP changes
    const updated = switches[index]!
    const newManagementIp = updated.management_ip
    const newName = updated.name
    if (newManagementIp !== oldManagementIp || (newName !== oldName && newManagementIp)) {
      syncManagementIpAllocation(updated.id, newName, newManagementIp, oldManagementIp)
    }

    return updated
  },

  updatePort(switchId: string, portId: string, data: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Port {
    const switches = this.list()
    const swIndex = switches.findIndex(s => s.id === switchId)
    if (swIndex === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const sw = switches[swIndex]!
    const portIndex = sw.ports.findIndex(p => p.id === portId)
    if (portIndex === -1) {
      throw createError({ statusCode: 404, message: 'Port not found' })
    }

    const oldPort = sw.ports[portIndex]!

    // Handle bidirectional link: remove old link if connection changed or removed
    if (oldPort.connected_device_id && oldPort.connected_port_id) {
      const deviceChanged = data.connected_device_id !== undefined && data.connected_device_id !== oldPort.connected_device_id
      const portChanged = data.connected_port_id !== undefined && data.connected_port_id !== oldPort.connected_port_id
      const removed = data.connected_device_id === null || data.connected_device_id === undefined

      if (removed || deviceChanged || portChanged) {
        this._removeRemoteLink(switches, oldPort.connected_device_id, oldPort.connected_port_id)
      }
    }

    sw.ports[portIndex] = {
      ...oldPort,
      ...data
    } as Port

    const updatedPort = sw.ports[portIndex]!

    // Handle bidirectional link creation (after local port is updated so label/settings are current)
    if (data.connected_device_id && data.connected_port_id) {
      this._createRemoteLink(switches, data.connected_device_id, data.connected_port_id, switchId, portId, {
        speed: updatedPort.speed,
        native_vlan: updatedPort.native_vlan,
        tagged_vlans: updatedPort.tagged_vlans,
        status: updatedPort.status
      })
    }

    sw.updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)
    return updatedPort
  },

  bulkUpdatePorts(switchId: string, portIds: string[], updates: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Port[] {
    const switches = this.list()
    const swIndex = switches.findIndex(s => s.id === switchId)
    if (swIndex === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const sw = switches[swIndex]!
    const updatedPorts: Port[] = []
    for (const portId of portIds) {
      const portIndex = sw.ports.findIndex(p => p.id === portId)
      if (portIndex !== -1) {
        sw.ports[portIndex] = {
          ...sw.ports[portIndex]!,
          ...updates
        } as Port
        updatedPorts.push(sw.ports[portIndex]!)
      }
    }

    sw.updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)
    return updatedPorts
  },

  applyPortVlanUpdate(
    switchId: string,
    portId: string,
    portData: Partial<Omit<Port, 'id' | 'unit' | 'index'>>,
    options: {
      expectedUpdatedAt?: string
      siteVlanIds?: number[]
    } = {}
  ): { port: Port; updatedAt: string; vlansAddedToSwitch: number[] } {
    const switches = this.list()
    const sw = switches.find(s => s.id === switchId)
    if (!sw) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

    // Optimistic concurrency check
    if (options.expectedUpdatedAt && sw.updated_at !== options.expectedUpdatedAt) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Switch was modified since page load',
        data: { current_updated_at: sw.updated_at }
      })
    }

    const port = sw.ports.find(p => p.id === portId)
    if (!port) throw createError({ statusCode: 404, statusMessage: 'Port not found' })

    // Collect all VLAN IDs from the request
    const requestedVlans: number[] = []
    if (portData.access_vlan) requestedVlans.push(portData.access_vlan)
    if (portData.native_vlan) requestedVlans.push(portData.native_vlan)
    if (portData.tagged_vlans) requestedVlans.push(...portData.tagged_vlans)

    // Verify all VLANs exist as site entities
    if (options.siteVlanIds && requestedVlans.length > 0) {
      for (const vlanId of requestedVlans) {
        if (!options.siteVlanIds.includes(vlanId)) {
          throw createError({
            statusCode: 404,
            statusMessage: `VLAN ${vlanId} does not exist in this site`
          })
        }
      }
    }

    // Auto-add any unconfigured VLANs to this switch's configured_vlans
    const configuredVlans = sw.configured_vlans || []
    const vlansToAdd: number[] = []
    for (const vlanId of requestedVlans) {
      if (!configuredVlans.includes(vlanId)) {
        vlansToAdd.push(vlanId)
      }
    }

    if (vlansToAdd.length > 0) {
      sw.configured_vlans = normalizeConfiguredVlans([...configuredVlans, ...vlansToAdd])
    }

    // Merge port data
    Object.assign(port, portData)

    sw.updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)

    return {
      port,
      updatedAt: sw.updated_at,
      vlansAddedToSwitch: vlansToAdd
    }
  },

  /**
   * Add VLANs to a target switch's configured_vlans list.
   * Used when overriding during connected switch selection.
   */
  addVlansToSwitch(
    switchId: string,
    vlanIds: number[]
  ): { addedVlans: number[]; updatedAt: string } {
    const switches = this.list()
    const sw = switches.find(s => s.id === switchId)
    if (!sw) throw createError({ statusCode: 404, statusMessage: 'Target switch not found' })

    const configuredVlans = sw.configured_vlans || []
    const vlansToAdd = vlanIds.filter(v => !configuredVlans.includes(v))

    if (vlansToAdd.length > 0) {
      sw.configured_vlans = normalizeConfiguredVlans([...configuredVlans, ...vlansToAdd])
      sw.updated_at = new Date().toISOString()
      writeJson(FILE_NAME, switches)
    }

    return {
      addedVlans: vlansToAdd,
      updatedAt: sw.updated_at
    }
  },

  applyConfiguredVlansRemoval(
    switchId: string,
    vlanId: number,
    options: {
      expectedUpdatedAt?: string
      portCleanup?: Array<{
        port_id: string
        field: 'access_vlan' | 'native_vlan' | 'tagged_vlans'
        new_value?: number | null
        action?: 'auto_remove'
      }>
    } = {}
  ): { updatedAt: string; portsUpdated: number } {
    const switches = this.list()
    const sw = switches.find(s => s.id === switchId)
    if (!sw) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

    // Optimistic concurrency check
    if (options.expectedUpdatedAt && sw.updated_at !== options.expectedUpdatedAt) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Switch was modified since page load',
        data: { current_updated_at: sw.updated_at }
      })
    }

    const configuredVlans = sw.configured_vlans || []
    if (!configuredVlans.includes(vlanId)) {
      throw createError({ statusCode: 422, statusMessage: `VLAN ${vlanId} is not in configured_vlans` })
    }

    // Apply port cleanup
    let portsUpdated = 0
    if (options.portCleanup) {
      for (const cleanup of options.portCleanup) {
        const port = sw.ports.find(p => p.id === cleanup.port_id)
        if (!port) continue

        if (cleanup.field === 'tagged_vlans') {
          port.tagged_vlans = (port.tagged_vlans || []).filter(v => v !== vlanId)
        } else if (cleanup.field === 'access_vlan') {
          port.access_vlan = cleanup.new_value ?? undefined
        } else if (cleanup.field === 'native_vlan') {
          port.native_vlan = cleanup.new_value ?? undefined
        }
        portsUpdated++
      }
    }

    // Also auto-remove from tagged_vlans on ports not in portCleanup
    for (const port of sw.ports) {
      if (port.tagged_vlans?.includes(vlanId)) {
        const alreadyHandled = options.portCleanup?.some(
          c => c.port_id === port.id && c.field === 'tagged_vlans'
        )
        if (!alreadyHandled) {
          port.tagged_vlans = port.tagged_vlans.filter(v => v !== vlanId)
          portsUpdated++
        }
      }
    }

    // Remove from configured_vlans
    sw.configured_vlans = normalizeConfiguredVlans(configuredVlans.filter(v => v !== vlanId))
    sw.updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)

    return { updatedAt: sw.updated_at, portsUpdated }
  },

  duplicate(id: string): Switch {
    const original = this.getById(id)
    if (!original) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const switches = this.list()
    let copyName = `${original.name} (Copy)`
    let counter = 1
    while (switches.some(s => s.name === copyName)) {
      counter++
      copyName = `${original.name} (Copy ${counter})`
    }

    const now = new Date().toISOString()
    const duplicate: Switch = {
      ...original,
      id: nanoid(),
      name: copyName,
      ports: original.ports.map(p => ({
        ...p,
        id: nanoid(),
        connected_device: undefined,
        connected_device_id: undefined,
        connected_port_id: undefined,
        connected_port: undefined,
        connected_allocation_id: undefined
      })),
      is_favorite: false,
      created_at: now,
      updated_at: now
    }

    switches.push(duplicate)
    writeJson(FILE_NAME, switches)
    return duplicate
  },

  delete(id: string): boolean {
    const switches = this.list()
    const index = switches.findIndex(s => s.id === id)
    if (index === -1) return false

    // Remove bidirectional links from connected switches
    const sw = switches[index]!
    for (const port of sw.ports) {
      if (port.connected_device_id && port.connected_port_id) {
        this._removeRemoteLink(switches, port.connected_device_id, port.connected_port_id)
      }
    }

    // Clean up management IP allocation
    if (sw.management_ip) {
      syncManagementIpAllocation(sw.id, sw.name, undefined, sw.management_ip)
    }

    switches.splice(index, 1)
    writeJson(FILE_NAME, switches)
    return true
  },

  _removeRemoteLink(switches: Switch[], remoteSwitchId: string, remotePortId: string): void {
    const remoteSw = switches.find(s => s.id === remoteSwitchId)
    if (!remoteSw) return

    const remotePort = remoteSw.ports.find(p => p.id === remotePortId)
    if (!remotePort) return

    remotePort.connected_device = undefined
    remotePort.connected_device_id = undefined
    remotePort.connected_port_id = undefined
    remotePort.connected_port = undefined
  },

  _createRemoteLink(switches: Switch[], remoteSwitchId: string, remotePortId: string, localSwitchId: string, localPortId: string, syncSettings?: Partial<Port>): void {
    const remoteSw = switches.find(s => s.id === remoteSwitchId)
    if (!remoteSw) return

    const localSw = switches.find(s => s.id === localSwitchId)
    if (!localSw) return

    const remotePort = remoteSw.ports.find(p => p.id === remotePortId)
    if (!remotePort) return

    const localPort = localSw.ports.find(p => p.id === localPortId)
    if (!localPort) return

    // Set bidirectional link
    remotePort.connected_device = localSw.name
    remotePort.connected_device_id = localSwitchId
    remotePort.connected_port_id = localPortId
    remotePort.connected_port = localPort.label
    remotePort.connected_allocation_id = undefined

    // Sync port settings to remote side
    if (syncSettings) {
      if (syncSettings.speed) remotePort.speed = syncSettings.speed
      if (syncSettings.native_vlan !== undefined) remotePort.native_vlan = syncSettings.native_vlan
      if (syncSettings.tagged_vlans) remotePort.tagged_vlans = [...syncSettings.tagged_vlans]
      if (syncSettings.status === 'up') remotePort.status = 'up'
    }
  }
}
