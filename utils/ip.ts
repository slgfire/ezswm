export function ipv4ToNumber(ipAddress: string): number | null {
  const octets = ipAddress.trim().split('.')
  if (octets.length !== 4) return null

  let numericValue = 0
  for (const octet of octets) {
    if (!/^\d+$/.test(octet)) return null

    const octetValue = Number(octet)
    if (!Number.isInteger(octetValue) || octetValue < 0 || octetValue > 255) return null

    numericValue = (numericValue << 8) + octetValue
  }

  return numericValue >>> 0
}

export function compareIpAddresses(left: string, right: string): number {
  const leftNumeric = ipv4ToNumber(left)
  const rightNumeric = ipv4ToNumber(right)

  if (leftNumeric !== null && rightNumeric !== null) {
    return leftNumeric - rightNumeric
  }

  if (leftNumeric !== null) return -1
  if (rightNumeric !== null) return 1

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
}


export function isIpWithinRange(ipAddress: string, startIp: string, endIp: string): boolean {
  const ip = ipv4ToNumber(ipAddress)
  const start = ipv4ToNumber(startIp)
  const end = ipv4ToNumber(endIp)
  if (ip === null || start === null || end === null) return false
  return start <= ip && ip <= end
}

export function ipRangeSize(startIp: string, endIp: string): number {
  const start = ipv4ToNumber(startIp)
  const end = ipv4ToNumber(endIp)
  if (start === null || end === null || start > end) return 0
  return (end - start) + 1
}
