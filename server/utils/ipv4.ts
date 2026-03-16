export function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

export function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.')
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    const num = Number(part)
    return Number.isInteger(num) && num >= 0 && num <= 255 && part === String(num)
  })
}

export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split('/')
  if (parts.length !== 2) return false
  if (!isValidIPv4(parts[0])) return false
  const prefix = Number(parts[1])
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32
}

export interface SubnetInfo {
  network_address: string
  broadcast_address: string
  subnet_mask: string
  wildcard_mask: string
  first_usable: string
  last_usable: string
  total_hosts: number
  usable_hosts: number
  prefix_length: number
}

export function parseSubnet(cidr: string): SubnetInfo {
  const [ip, prefixStr] = cidr.split('/')
  const prefix = Number(prefixStr)
  const ipLong = ipToLong(ip)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const wildcard = (~mask) >>> 0
  const network = (ipLong & mask) >>> 0
  const broadcast = (network | wildcard) >>> 0
  const totalHosts = wildcard + 1
  const usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts

  return {
    network_address: longToIp(network),
    broadcast_address: longToIp(broadcast),
    subnet_mask: longToIp(mask),
    wildcard_mask: longToIp(wildcard),
    first_usable: totalHosts > 2 ? longToIp(network + 1) : longToIp(network),
    last_usable: totalHosts > 2 ? longToIp(broadcast - 1) : longToIp(broadcast),
    total_hosts: totalHosts,
    usable_hosts: usableHosts,
    prefix_length: prefix
  }
}

export function isIPInSubnet(ip: string, cidr: string): boolean {
  const [subnetIp, prefixStr] = cidr.split('/')
  const prefix = Number(prefixStr)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = (ipToLong(subnetIp) & mask) >>> 0
  const ipLong = ipToLong(ip)
  return (ipLong & mask) >>> 0 === network
}

export function doRangesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const s1 = ipToLong(start1)
  const e1 = ipToLong(end1)
  const s2 = ipToLong(start2)
  const e2 = ipToLong(end2)
  return s1 <= e2 && s2 <= e1
}

export function isValidMacAddress(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac)
}
