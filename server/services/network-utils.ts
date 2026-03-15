export function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) {
    throw new Error('Invalid IPv4 address')
  }

  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

export function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255
  ].join('.')
}

export function prefixToNetmask(prefix: number): string {
  if (prefix < 0 || prefix > 32) {
    throw new Error('Prefix must be between 0 and 32')
  }

  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0)
  return intToIpv4(mask)
}

export function subnetContainsIp(subnet: string, prefix: number, ip: string): boolean {
  const networkInt = ipv4ToInt(subnet)
  const ipInt = ipv4ToInt(ip)
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0)
  return (networkInt & mask) === (ipInt & mask)
}
