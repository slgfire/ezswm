type SwitchManagementSource = {
  management_ip?: unknown
  management_protocol?: unknown
  management_url?: unknown
}

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 32 || code === 127) return true
  }
  return false
}

export function isValidManagementUrlOverride(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const candidate = value.trim()
  if (!candidate || candidate.length > 2048 || /\s/.test(candidate) || hasControlCharacters(candidate)) return false

  try {
    const url = new URL(candidate)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname && !url.username && !url.password
  } catch {
    return false
  }
}

function managementIpHost(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const ip = value.trim()
  const octets = ip.split('.')

  if (octets.length === 4 && octets.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)) {
    return octets.map(Number).join('.')
  }

  if (!/^\[[\da-f:.]+\]$/i.test(ip)) return null
  try {
    const url = new URL(`https://${ip}/`)
    return url.hostname.startsWith('[') && url.hostname.toLowerCase() === ip.toLowerCase() ? url.hostname.toLowerCase() : null
  } catch {
    return null
  }
}

export function getSwitchManagementHref(source: SwitchManagementSource): string | null {
  const override = source.management_url
  if (override !== undefined && override !== null && override !== '') {
    if (!isValidManagementUrlOverride(override)) return null
    return new URL((override as string).trim()).href
  }

  const host = managementIpHost(source.management_ip)
  if (!host) return null
  return `${source.management_protocol === 'http' ? 'http' : 'https'}://${host}/`
}
