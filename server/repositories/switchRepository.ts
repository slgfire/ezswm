import { nanoid } from 'nanoid'
import { readJson, writeJson } from '../storage/jsonStorage'
import type { Switch } from '../../types/switch'
import type { Port } from '../../types/port'
import { layoutTemplateRepository } from './layoutTemplateRepository'

const FILE_NAME = 'switches.json'

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[\/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

function generatePortsFromTemplate(templateId: string): Port[] {
  const template = layoutTemplateRepository.getById(templateId)
  if (!template) return []

  const ports: Port[] = []
  for (const unit of template.units) {
    for (const block of unit.blocks) {
      for (let i = 0; i < block.count; i++) {
        const portIndex = block.start_index + i
        ports.push({
          id: nanoid(),
          unit: unit.unit_number,
          index: portIndex,
          label: generatePortLabel(block.label, unit.unit_number, portIndex),
          type: block.type,
          speed: block.default_speed,
          status: 'down',
          tagged_vlans: []
        })
      }
    }
  }
  return ports
}

export const switchRepository = {
  list(): Switch[] {
    return readJson<Switch[]>(FILE_NAME)
  },

  getById(id: string): Switch | null {
    const switches = this.list()
    return switches.find(s => s.id === id) || null
  },

  create(data: Omit<Switch, 'id' | 'ports' | 'created_at' | 'updated_at' | 'is_favorite'>): Switch {
    const switches = this.list()

    if (switches.some(s => s.name === data.name)) {
      throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists` })
    }

    const ports = data.layout_template_id
      ? generatePortsFromTemplate(data.layout_template_id)
      : []

    const now = new Date().toISOString()
    const sw: Switch = {
      id: nanoid(),
      ...data,
      ports,
      is_favorite: false,
      created_at: now,
      updated_at: now
    }

    switches.push(sw)
    writeJson(FILE_NAME, switches)
    return sw
  },

  update(id: string, data: Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>): Switch {
    const switches = this.list()
    const index = switches.findIndex(s => s.id === id)
    if (index === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    if (data.name && data.name !== switches[index].name) {
      if (switches.some(s => s.name === data.name)) {
        throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists` })
      }
    }

    // Regenerate ports if layout_template_id changed
    let ports = switches[index].ports
    if (data.layout_template_id && data.layout_template_id !== switches[index].layout_template_id) {
      ports = generatePortsFromTemplate(data.layout_template_id)
    }

    switches[index] = {
      ...switches[index],
      ...data,
      ports,
      updated_at: new Date().toISOString()
    }

    writeJson(FILE_NAME, switches)
    return switches[index]
  },

  updatePort(switchId: string, portId: string, data: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Port {
    const switches = this.list()
    const swIndex = switches.findIndex(s => s.id === switchId)
    if (swIndex === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const portIndex = switches[swIndex].ports.findIndex(p => p.id === portId)
    if (portIndex === -1) {
      throw createError({ statusCode: 404, message: 'Port not found' })
    }

    const oldPort = switches[swIndex].ports[portIndex]

    // Handle bidirectional link: remove old link if connection changed or removed
    if (oldPort.connected_device_id && oldPort.connected_port_id) {
      const deviceChanged = data.connected_device_id !== undefined && data.connected_device_id !== oldPort.connected_device_id
      const portChanged = data.connected_port_id !== undefined && data.connected_port_id !== oldPort.connected_port_id
      const removed = data.connected_device_id === null || data.connected_device_id === undefined

      if (removed || deviceChanged || portChanged) {
        this._removeRemoteLink(switches, oldPort.connected_device_id, oldPort.connected_port_id)
      }
    }

    switches[swIndex].ports[portIndex] = {
      ...oldPort,
      ...data
    }

    const updatedPort = switches[swIndex].ports[portIndex]

    // Handle bidirectional link creation (after local port is updated so label/settings are current)
    if (data.connected_device_id && data.connected_port_id) {
      this._createRemoteLink(switches, data.connected_device_id, data.connected_port_id, switchId, portId, {
        speed: updatedPort.speed,
        native_vlan: updatedPort.native_vlan,
        tagged_vlans: updatedPort.tagged_vlans,
        status: updatedPort.status
      })
    }

    switches[swIndex].updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)
    return switches[swIndex].ports[portIndex]
  },

  bulkUpdatePorts(switchId: string, portIds: string[], updates: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Port[] {
    const switches = this.list()
    const swIndex = switches.findIndex(s => s.id === switchId)
    if (swIndex === -1) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const updatedPorts: Port[] = []
    for (const portId of portIds) {
      const portIndex = switches[swIndex].ports.findIndex(p => p.id === portId)
      if (portIndex !== -1) {
        switches[swIndex].ports[portIndex] = {
          ...switches[swIndex].ports[portIndex],
          ...updates
        }
        updatedPorts.push(switches[swIndex].ports[portIndex])
      }
    }

    switches[swIndex].updated_at = new Date().toISOString()
    writeJson(FILE_NAME, switches)
    return updatedPorts
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
        connected_port: undefined
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
    const sw = switches[index]
    for (const port of sw.ports) {
      if (port.connected_device_id && port.connected_port_id) {
        this._removeRemoteLink(switches, port.connected_device_id, port.connected_port_id)
      }
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

    // Sync port settings to remote side
    if (syncSettings) {
      if (syncSettings.speed) remotePort.speed = syncSettings.speed
      if (syncSettings.native_vlan !== undefined) remotePort.native_vlan = syncSettings.native_vlan
      if (syncSettings.tagged_vlans) remotePort.tagged_vlans = [...syncSettings.tagged_vlans]
      if (syncSettings.status === 'up') remotePort.status = 'up'
    }
  }
}
