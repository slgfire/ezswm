import type { DuplexMode, MediaType, Port, PortStatus, PortUpdatePayload } from '~/types/models'
import { useStorage } from '~/server/storage'

const ALLOWED_STATUS: PortStatus[] = ['free', 'used', 'disabled', 'error']
const ALLOWED_MEDIA: MediaType[] = ['RJ45', 'SFP', 'SFP+', 'QSFP']
const ALLOWED_DUPLEX: DuplexMode[] = ['half', 'full', 'auto']

function normalizeText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

function coerceTextField(body: Record<string, unknown>, key: string, ...legacyKeys: string[]): string | undefined {
  const candidates = [key, ...legacyKeys]
  for (const candidate of candidates) {
    const normalized = normalizeText(body[candidate])
    if (normalized !== undefined) {
      return normalized
    }
  }
  return undefined
}

function coerceDuplexField(body: Record<string, unknown>): DuplexMode {
  const duplex = body.duplex
  return normalizeDuplex(duplex)
}

function normalizeDuplex(value: unknown): DuplexMode {
  return ALLOWED_DUPLEX.includes(value as DuplexMode) ? (value as DuplexMode) : 'auto'
}

function isValidVlan(vlan?: string) {
  if (!vlan) return true
  if (!/^\d+$/.test(vlan)) return false
  const number = Number(vlan)
  return number >= 1 && number <= 4094
}

function isValidMac(macAddress?: string) {
  if (!macAddress) return true
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(macAddress)
}

function sanitizePayload(payload: Partial<PortUpdatePayload> & Record<string, unknown>): Partial<Port> {
  const status = payload.status
  const mediaType = payload.mediaType
  const poe = payload.poe

  return {
    status,
    mediaType,
    label: coerceTextField(payload, 'label', 'portLabel'),
    description: coerceTextField(payload, 'description'),
    vlan: coerceTextField(payload, 'vlan', 'vlanId'),
    speed: coerceTextField(payload, 'speed'),
    duplex: coerceDuplexField(payload),
    poe: Boolean(poe),
    connectedDevice: coerceTextField(payload, 'connectedDevice', 'hostname', 'device'),
    macAddress: coerceTextField(payload, 'macAddress', 'mac'),
    patchTarget: coerceTextField(payload, 'patchTarget', 'patch_target')
  }
}

export default defineEventHandler(async (event) => {
  const switchId = getRouterParam(event, 'id')
  const portNumber = Number(getRouterParam(event, 'portNumber'))
  const body = await readBody<Partial<PortUpdatePayload> & Record<string, unknown>>(event)

  if (!switchId || Number.isNaN(portNumber)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid switch or port ID.' })
  }

  if (!body.status || !ALLOWED_STATUS.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port status.' })
  }

  if (body.mediaType && !ALLOWED_MEDIA.includes(body.mediaType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid port media type.' })
  }

  const updates = sanitizePayload(body)

  if (!isValidVlan(updates.vlan)) {
    throw createError({ statusCode: 400, statusMessage: 'VLAN must be between 1 and 4094.' })
  }

  if (!isValidMac(updates.macAddress)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid MAC address.' })
  }

  const storage = useStorage()
  const updated = await storage.ports.updateBySwitchAndNumber(switchId, portNumber, updates)

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Port not found.' })
  }

  return updated
})
