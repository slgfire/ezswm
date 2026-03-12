import type { MediaType, Port, PortStatus } from '~/types/models'
import { readStore, writeStore } from '~/server/utils/storage'

const ALLOWED_STATUS: PortStatus[] = ['free', 'used', 'disabled', 'error']
const ALLOWED_MEDIA: MediaType[] = ['RJ45', 'SFP', 'SFP+', 'QSFP']

function isValidVlan(vlan?: string) {
  if (!vlan || !vlan.trim()) return true
  if (!/^\d+$/.test(vlan.trim())) return false
  const value = Number(vlan)
  return value >= 1 && value <= 4094
}

function isValidMac(macAddress?: string) {
  if (!macAddress || !macAddress.trim()) return true
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(macAddress.trim())
}

function cleanedValue(value?: string) {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function hasOwnField(payload: Partial<Port>, field: keyof Port) {
  return Object.prototype.hasOwnProperty.call(payload, field)
}

function resolveTextField(payload: Partial<Port>, current: string | undefined, field: keyof Port) {
  if (!hasOwnField(payload, field)) return current
  return cleanedValue(payload[field] as string | undefined)
}

export default defineEventHandler(async (event) => {
  const switchId = getRouterParam(event, 'id')
  const portNumber = Number(getRouterParam(event, 'portNumber'))
  const body = await readBody<Partial<Port>>(event)

  if (!switchId || Number.isNaN(portNumber)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Switch- oder Port-ID.' })
  }

  if (body.status && !ALLOWED_STATUS.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Port-Status.' })
  }

  if (body.mediaType && !ALLOWED_MEDIA.includes(body.mediaType)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Port-Typ.' })
  }

  const vlan = resolveTextField(body, undefined, 'vlan')
  const macAddress = resolveTextField(body, undefined, 'macAddress')

  if (!isValidVlan(vlan)) {
    throw createError({ statusCode: 400, statusMessage: 'VLAN muss zwischen 1 und 4094 liegen.' })
  }

  if (!isValidMac(macAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige MAC-Adresse.' })
  }

  const store = await readStore()
  const switchEntry = store.switches.find((item) => item.id === switchId)

  if (!switchEntry) {
    throw createError({ statusCode: 404, statusMessage: 'Switch nicht gefunden.' })
  }

  const portIndex = switchEntry.ports.findIndex((port) => port.portNumber === portNumber)

  if (portIndex < 0) {
    throw createError({ statusCode: 404, statusMessage: 'Port nicht gefunden.' })
  }

  const current = switchEntry.ports[portIndex]

  const updatedPort: Port = {
    ...current,
    ...body,
    switchId,
    portNumber,
    status: body.status ?? current.status,
    mediaType: body.mediaType ?? current.mediaType,
    vlan: resolveTextField(body, current.vlan, 'vlan'),
    macAddress: resolveTextField(body, current.macAddress, 'macAddress'),
    label: resolveTextField(body, current.label, 'label'),
    connectedDevice: resolveTextField(body, current.connectedDevice, 'connectedDevice'),
    description: resolveTextField(body, current.description, 'description'),
    speed: resolveTextField(body, current.speed, 'speed'),
    patchTarget: resolveTextField(body, current.patchTarget, 'patchTarget'),
    duplex: hasOwnField(body, 'duplex') ? body.duplex : current.duplex,
    poe: hasOwnField(body, 'poe') ? Boolean(body.poe) : Boolean(current.poe)
  }

  if (!isValidVlan(updatedPort.vlan)) {
    throw createError({ statusCode: 400, statusMessage: 'VLAN muss zwischen 1 und 4094 liegen.' })
  }

  if (!isValidMac(updatedPort.macAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige MAC-Adresse.' })
  }

  switchEntry.ports[portIndex] = updatedPort
  switchEntry.updatedAt = new Date().toISOString()

  await writeStore(store)

  return updatedPort
})
