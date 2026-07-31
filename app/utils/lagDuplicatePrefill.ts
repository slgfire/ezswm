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
