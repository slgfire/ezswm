export function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return false
  }

  return parts.every((part) => {
    const value = Number(part)
    return Number.isInteger(value) && value >= 0 && value <= 255
  })
}

export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0)
}

export function numberToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >> shift) & 255).join('.')
}

export function prefixToNetmask(prefix: number): string {
  const mask = prefix === 0 ? 0 : 0xFFFFFFFF ^ (2 ** (32 - prefix) - 1)
  return numberToIp(mask >>> 0)
}

export function cidrRange(subnet: string, prefix: number): { start: number, end: number } {
  const subnetInt = ipToNumber(subnet)
  const hostBits = 32 - prefix
  const networkSize = 2 ** hostBits
  return {
    start: subnetInt,
    end: subnetInt + networkSize - 1
  }
}

export function ipInSubnet(ip: string, subnet: string, prefix: number): boolean {
  if (!isValidIpv4(ip) || !isValidIpv4(subnet)) {
    return false
  }

  const { start, end } = cidrRange(subnet, prefix)
  const ipValue = ipToNumber(ip)
  return ipValue >= start && ipValue <= end
}
