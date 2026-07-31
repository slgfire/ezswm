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
