export const isValidIpv4 = (value: string): boolean => {
  const parts = value.split('.')
  if (parts.length !== 4) return false

  return parts.every(part => {
    if (!/^\d+$/.test(part)) return false
    const n = Number(part)
    return n >= 0 && n <= 255
  })
}

export const ipv4ToInt = (value: string): number => {
  const [a, b, c, d] = value.split('.').map(Number)
  return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d
}

export const prefixToNetmask = (prefix: number): string => {
  const mask = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1) >>> 0)
  return [24, 16, 8, 0].map(s => (mask >>> s) & 255).join('.')
}

export const isIpInSubnet = (ip: string, subnet: string, prefix: number): boolean => {
  if (!isValidIpv4(ip) || !isValidIpv4(subnet)) return false

  const mask = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1) >>> 0)
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(subnet) & mask)
}
