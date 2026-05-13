/**
 * Frontend-only subnet calculation utilities.
 * These mirror server/utils/ipv4.ts for use in Vue components (auto-imported by Nuxt).
 */

/**
 * Converts a dotted-decimal IPv4 address to a 32-bit unsigned integer.
 */
export function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0
}

/**
 * Result type returned by parseSubnetInfo.
 */
export interface SubnetInfo {
  network: string
  broadcast: string
  mask: string
  totalHosts: number
  usableHosts: number
  prefix: number
}

const ZEROED_SUBNET_INFO: SubnetInfo = {
  network: '-',
  broadcast: '-',
  mask: '-',
  totalHosts: 0,
  usableHosts: 0,
  prefix: 0,
}

/**
 * Computes subnet details from a CIDR notation string (e.g. "192.168.1.0/24").
 * Returns a zeroed result for invalid input.
 */
export function parseSubnetInfo(subnet: string): SubnetInfo {
  if (!subnet) return { ...ZEROED_SUBNET_INFO }

  const parts = subnet.split('/')
  if (parts.length !== 2) return { ...ZEROED_SUBNET_INFO }

  const prefix = parseInt(parts[1]!, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return { ...ZEROED_SUBNET_INFO }

  const ipParts = parts[0]!.split('.').map(Number)
  if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return { ...ZEROED_SUBNET_INFO }
  }

  const numToIp = (n: number) =>
    `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`

  const ipNum = ((ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!) >>> 0
  const maskNum = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const networkNum = (ipNum & maskNum) >>> 0
  const broadcastNum = (networkNum | (~maskNum >>> 0)) >>> 0
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix <= 30 ? totalHosts - 2 : totalHosts

  return {
    network: numToIp(networkNum),
    broadcast: numToIp(broadcastNum),
    mask: numToIp(maskNum),
    totalHosts,
    usableHosts: Math.max(0, usableHosts),
    prefix,
  }
}

/**
 * Abbreviates an end IP address when it shares leading octets with the start IP.
 * Example: abbreviateEndIp('10.0.1.1', '10.0.1.50') → '.50'
 */
export function abbreviateEndIp(startIp: string, endIp: string): string {
  const startParts = startIp.split('.')
  const endParts = endIp.split('.')
  let common = 0
  for (let i = 0; i < 4; i++) {
    if (startParts[i] === endParts[i]) common++
    else break
  }
  if (common >= 3) return '.' + endParts.slice(3).join('.')
  if (common >= 2) return '.' + endParts.slice(2).join('.')
  return endIp
}

/**
 * Returns the number of IP addresses in a range (inclusive).
 * Example: rangeIpCount('10.0.0.1', '10.0.0.10') → 10
 */
export function rangeIpCount(startIp: string, endIp: string): number {
  return ipToLong(endIp) - ipToLong(startIp) + 1
}
