export const isIPv4 = (ip: string): boolean => {
  const chunks = ip.split('.')
  if (chunks.length !== 4) return false
  return chunks.every((chunk) => /^\d+$/.test(chunk) && Number(chunk) >= 0 && Number(chunk) <= 255)
}

export const ipToNumber = (ip: string): number => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

export const numberToIp = (num: number): string => {
  return [24, 16, 8, 0].map((shift) => (num >> shift) & 255).join('.')
}

export const prefixToNetmask = (prefix: number): string => {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return numberToIp(mask)
}

export const cidrRange = (subnet: string, prefix: number) => {
  const base = ipToNumber(subnet)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = base & mask
  const broadcast = network | (~mask >>> 0)
  return { network, broadcast }
}

export const ipInSubnet = (ip: string, subnet: string, prefix: number): boolean => {
  if (!isIPv4(ip) || !isIPv4(subnet)) return false
  const value = ipToNumber(ip)
  const { network, broadcast } = cidrRange(subnet, prefix)
  return value >= network && value <= broadcast
}

export const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
  const a1 = ipToNumber(aStart)
  const a2 = ipToNumber(aEnd)
  const b1 = ipToNumber(bStart)
  const b2 = ipToNumber(bEnd)
  return a1 <= b2 && b1 <= a2
}
