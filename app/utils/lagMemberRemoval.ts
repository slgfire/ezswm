import type { LAGGroup } from '~~/types/lagGroup'

export function routeLagMemberRemoval(lag: LAGGroup, portId: string, openEdit: (lag: LAGGroup, removePortId?: string) => void, removeLocal: (lagId: string, portId: string) => void) {
  if (lag.remote_device_id) return openEdit(lag, portId)
  return removeLocal(lag.id, portId)
}
