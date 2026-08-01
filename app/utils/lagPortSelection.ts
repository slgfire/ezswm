import { removeLagPort } from './lagPortOptions'

export function onLocalPortsChange(
  form: { port_ids: string[] },
  menu: { value: boolean },
  portIds: string[]
) {
  form.port_ids = portIds
  menu.value = true
}

export function removePortFromSelection(
  form: { port_ids: string[] },
  portMapping: Record<string, unknown>,
  menu: { value: boolean },
  portId: string
) {
  form.port_ids = removeLagPort(form.port_ids, portId)
  delete portMapping[portId]
  menu.value = true
}
