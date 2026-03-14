export const isValidIpv4 = (ip: string): boolean => {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

const toInt = (ip: string): number => ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0

export const prefixToNetmask = (prefix: number): string => {
  if (prefix < 0 || prefix > 32) return '0.0.0.0'
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return [24, 16, 8, 0].map((shift) => (mask >> shift) & 255).join('.')
}

export const isIpInSubnet = (ip: string, subnet: string, prefix: number): boolean => {
  if (!isValidIpv4(ip) || !isValidIpv4(subnet)) return false
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return (toInt(ip) & mask) === (toInt(subnet) & mask)
}
