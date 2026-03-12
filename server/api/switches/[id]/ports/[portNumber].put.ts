import type { MediaType, Port, PortStatus } from '~/types/models'
import { useStorage } from '~/server/storage'

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

type PortPayload = Partial<Port> & { hostname?: string; device?: string; mac?: string; patch_target?: string }

function hasOwnField(payload: PortPayload, field: keyof Port | 'hostname' | 'device' | 'mac' | 'patch_target') {
  return Object.prototype.hasOwnProperty.call(payload, field)
}

function resolveTextField(payload: PortPayload, current: string | undefined, field: keyof Port) {
  if (!hasOwnField(payload, field)) return current
  return cleanedValue(payload[field] as string | undefined)
}


function resolveConnectedDevice(payload: PortPayload, current: string | undefined) {
  if (hasOwnField(payload, 'connectedDevice')) return cleanedValue(payload.connectedDevice)
  if (hasOwnField(payload, 'hostname')) return cleanedValue(payload.hostname)
  if (hasOwnField(payload, 'device')) return cleanedValue(payload.device)
  return current
}

function resolvePatchTarget(payload: PortPayload, current: string | undefined) {
  if (hasOwnField(payload, 'patchTarget')) return cleanedValue(payload.patchTarget)
  if (hasOwnField(payload, 'patch_target')) return cleanedValue(payload.patch_target)
  return current
}

function resolveMacAddress(payload: PortPayload, current: string | undefined) {
  if (hasOwnField(payload, 'macAddress')) return cleanedValue(payload.macAddress)
  if (hasOwnField(payload, 'mac')) return cleanedValue(payload.mac)
  return current
}

export default defineEventHandler(async (event) => {
  const switchId = getRouterParam(event, 'id')
  const portNumber = Number(getRouterParam(event, 'portNumber'))
  const body = await readBody<PortPayload>(event)

  if (!switchId || Number.isNaN(portNumber)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid switch or port ID.' })
  }

  if (body.status && !ALLOWED_STATUS.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port status.' })
  }

  if (body.mediaType && !ALLOWED_MEDIA.includes(body.mediaType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port media type.' })
  }

  const vlan = resolveTextField(body, undefined, 'vlan')
  const macAddress = resolveMacAddress(body, undefined)

  if (!isValidVlan(vlan)) {
    throw createError({ statusCode: 400, statusMessage: 'VLAN must be between 1 and 4094.' })
  }

  if (!isValidMac(macAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid MAC address.' })
  }

  const storage = useStorage()
  const switchEntry = await storage.switches.getById(switchId)

  if (!switchEntry) {
    throw createError({ statusCode: 404, statusMessage: 'Switch not found.' })
  }

  const current = switchEntry.ports.find((port) => port.portNumber === portNumber)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Port not found.' })
  }

  const updatedPort: Port = {
    ...current,
    switchId,
    portNumber,
    status: body.status ?? current.status,
    mediaType: body.mediaType ?? current.mediaType,
    vlan: resolveTextField(body, current.vlan, 'vlan'),
    macAddress: resolveMacAddress(body, current.macAddress),
    label: resolveTextField(body, current.label, 'label'),
    connectedDevice: resolveConnectedDevice(body, current.connectedDevice),
    description: resolveTextField(body, current.description, 'description'),
    speed: resolveTextField(body, current.speed, 'speed'),
    patchTarget: resolvePatchTarget(body, current.patchTarget),
    duplex: hasOwnField(body, 'duplex')
      ? (body.duplex === 'full' || body.duplex === 'half' || body.duplex === 'auto' ? body.duplex : 'auto')
      : current.duplex || 'auto',
    poe: hasOwnField(body, 'poe') ? Boolean(body.poe) : Boolean(current.poe)
  }

  if (!isValidVlan(updatedPort.vlan)) {
    throw createError({ statusCode: 400, statusMessage: 'VLAN must be between 1 and 4094.' })
  }

  if (!isValidMac(updatedPort.macAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid MAC address.' })
  }

  const updated = await storage.ports.updateBySwitchAndNumber(switchId, portNumber, updatedPort)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Port not found.' })
  }

  return updated
})
