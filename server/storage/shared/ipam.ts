export function isValidIpv4(address: string): boolean {
  const trimmed = address.trim()
  const parts = trimmed.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

export function ipv4ToInt(address: string): number {
  const parts = address.split('.').map((part) => Number(part))
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
}

export function intToIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255
  ].join('.')
}

export function prefixToMask(prefix: number): string {
  const normalized = Math.max(0, Math.min(32, prefix))
  const maskInt = normalized === 0 ? 0 : ((0xFFFFFFFF << (32 - normalized)) >>> 0)
  return intToIpv4(maskInt)
}

export function subnetRange(subnet: string, prefix: number): { network: number; broadcast: number } {
  const subnetInt = ipv4ToInt(subnet)
  const maskInt = prefix === 0 ? 0 : ((0xFFFFFFFF << (32 - prefix)) >>> 0)
  const network = (subnetInt & maskInt) >>> 0
  const broadcast = (network | (~maskInt >>> 0)) >>> 0
  return { network, broadcast }
}

export function isIpInSubnet(ipAddress: string, subnet: string, prefix: number): boolean {
  if (!isValidIpv4(ipAddress) || !isValidIpv4(subnet)) return false
  const { network, broadcast } = subnetRange(subnet, prefix)
  const ipInt = ipv4ToInt(ipAddress)
  return ipInt >= network && ipInt <= broadcast
}

export function usableHostCount(prefix: number): number {
  if (prefix >= 31) return Math.max(0, 2 ** (32 - prefix))
  return Math.max(0, (2 ** (32 - prefix)) - 2)
}


export function isIpv4RangeValid(startIp: string, endIp: string): boolean {
  if (!isValidIpv4(startIp) || !isValidIpv4(endIp)) return false
  return ipv4ToInt(startIp) <= ipv4ToInt(endIp)
}

export function isIpInRange(ipAddress: string, startIp: string, endIp: string): boolean {
  if (!isValidIpv4(ipAddress) || !isIpv4RangeValid(startIp, endIp)) return false
  const value = ipv4ToInt(ipAddress)
  return value >= ipv4ToInt(startIp) && value <= ipv4ToInt(endIp)
}

export function rangeSize(startIp: string, endIp: string): number {
  if (!isIpv4RangeValid(startIp, endIp)) return 0
  return (ipv4ToInt(endIp) - ipv4ToInt(startIp)) + 1
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  if (!isIpv4RangeValid(startA, endA) || !isIpv4RangeValid(startB, endB)) return false
  const leftStart = ipv4ToInt(startA)
  const leftEnd = ipv4ToInt(endA)
  const rightStart = ipv4ToInt(startB)
  const rightEnd = ipv4ToInt(endB)
  return leftStart <= rightEnd && rightStart <= leftEnd
}
