import type { LAGGroup } from '~~/types/lagGroup'

export function getLagDuplicatePrefill(source: LAGGroup) {
  const hasManualRemote = !!source.remote_device && !source.remote_device_id

  return {
    description: source.description || '',
    remoteMode: hasManualRemote ? 'freetext' as const : 'none' as const,
    remote_device: hasManualRemote ? source.remote_device || '' : '',
    remote_device_id: undefined as string | undefined,
    selectedRemoteSwitchId: ''
  }
}

export function shouldUpdateLocalPortConnectionsForSubmit(isDuplicate: boolean, remoteMode: 'none' | 'switch' | 'freetext') {
  if (!isDuplicate) return true
  return remoteMode === 'freetext'
}

type PortLike = { id: string, connected_port?: string | null }
type PortMappingLike = { remotePortId?: string | null, remotePortLabel?: string | null }

export function buildDuplicateManualConnectedPorts(options: {
  isDuplicate: boolean
  remoteMode: 'none' | 'switch' | 'freetext'
  sourceLag: LAGGroup | null
  ports: PortLike[]
  targetPortIds: string[]
}) {
  if (!options.isDuplicate || options.remoteMode !== 'freetext' || !options.sourceLag) {
    return {} as Record<string, string | null>
  }

  const result: Record<string, string | null> = {}
  for (const [index, targetPortId] of options.targetPortIds.entries()) {
    const sourcePortId = options.sourceLag.port_ids[index]
    if (!sourcePortId) continue
    const sourcePort = options.ports.find(port => port.id === sourcePortId)
    result[targetPortId] = sourcePort?.connected_port ?? null
  }
  return result
}

export function buildLocalPortConnectionUpdateBody(options: {
  isDuplicate: boolean
  remoteMode: 'none' | 'switch' | 'freetext'
  remoteDevice: string
  sourceLag: LAGGroup | null
  ports: PortLike[]
  targetPortIds: string[]
  portMapping: Record<string, PortMappingLike | undefined>
  targetPortId: string
}) {
  if (options.remoteMode === 'none') {
    return {
      connected_device: null,
      connected_device_id: null,
      connected_port_id: null,
      connected_port: null,
    }
  }

  const mapping = options.portMapping[options.targetPortId]
  const duplicateManualConnectedPorts = buildDuplicateManualConnectedPorts({
    isDuplicate: options.isDuplicate,
    remoteMode: options.remoteMode,
    sourceLag: options.sourceLag,
    ports: options.ports,
    targetPortIds: options.targetPortIds
  })

  return {
    connected_device: options.remoteDevice,
    connected_device_id: null,
    connected_port_id: mapping?.remotePortId || null,
    connected_port: mapping?.remotePortLabel ?? duplicateManualConnectedPorts[options.targetPortId] ?? null,
  }
}
