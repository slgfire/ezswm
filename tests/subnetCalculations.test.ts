import {
  ipToLong,
  parseSubnetInfo,
  abbreviateEndIp,
  rangeIpCount,
  isValidIPv4,
  isIPInSubnet,
  findNetworkForIP,
} from '../app/utils/subnetCalculations'

describe('ipToLong', () => {
  it('converts 0.0.0.0 to 0', () => {
    expect(ipToLong('0.0.0.0')).toBe(0)
  })

  it('converts 255.255.255.255 to 4294967295', () => {
    expect(ipToLong('255.255.255.255')).toBe(4294967295)
  })

  it('converts 10.0.1.50 correctly', () => {
    expect(ipToLong('10.0.1.50')).toBe((10 << 24 | 0 << 16 | 1 << 8 | 50) >>> 0)
  })
})

describe('parseSubnetInfo', () => {
  it('parses 192.168.1.0/24 correctly', () => {
    const info = parseSubnetInfo('192.168.1.0/24')
    expect(info.network).toBe('192.168.1.0')
    expect(info.broadcast).toBe('192.168.1.255')
    expect(info.mask).toBe('255.255.255.0')
    expect(info.usableHosts).toBe(254)
    expect(info.totalHosts).toBe(256)
    expect(info.prefix).toBe(24)
  })

  it('parses 10.0.0.0/8 correctly', () => {
    const info = parseSubnetInfo('10.0.0.0/8')
    expect(info.network).toBe('10.0.0.0')
    expect(info.broadcast).toBe('10.255.255.255')
    expect(info.mask).toBe('255.0.0.0')
    expect(info.prefix).toBe(8)
  })

  it('parses 10.0.0.0/31 as point-to-point (usableHosts=2)', () => {
    const info = parseSubnetInfo('10.0.0.0/31')
    expect(info.usableHosts).toBe(2)
    expect(info.totalHosts).toBe(2)
    expect(info.network).toBe('10.0.0.0')
    expect(info.broadcast).toBe('10.0.0.1')
  })

  it('parses 10.0.0.1/32 as host route (usableHosts=1)', () => {
    const info = parseSubnetInfo('10.0.0.1/32')
    expect(info.usableHosts).toBe(1)
    expect(info.totalHosts).toBe(1)
    expect(info.network).toBe('10.0.0.1')
    expect(info.broadcast).toBe('10.0.0.1')
  })

  it('returns zeroed result for empty string', () => {
    const info = parseSubnetInfo('')
    expect(info.usableHosts).toBe(0)
    expect(info.totalHosts).toBe(0)
    expect(info.network).toBe('-')
    expect(info.broadcast).toBe('-')
    expect(info.mask).toBe('-')
    expect(info.prefix).toBe(0)
  })

  it('returns zeroed result for missing prefix', () => {
    const info = parseSubnetInfo('192.168.1.0')
    expect(info.usableHosts).toBe(0)
    expect(info.network).toBe('-')
  })

  it('returns zeroed result for invalid prefix number', () => {
    const info = parseSubnetInfo('192.168.1.0/99')
    expect(info.usableHosts).toBe(0)
    expect(info.network).toBe('-')
  })

  it('returns zeroed result for invalid IP part', () => {
    const info = parseSubnetInfo('not.an.ip/24')
    expect(info.usableHosts).toBe(0)
    expect(info.network).toBe('-')
  })
})

describe('abbreviateEndIp', () => {
  it('abbreviates when 3 octets are shared', () => {
    expect(abbreviateEndIp('10.0.1.1', '10.0.1.50')).toBe('.50')
  })

  it('abbreviates when 2 octets are shared', () => {
    expect(abbreviateEndIp('10.0.1.1', '10.0.5.50')).toBe('.5.50')
  })

  it('returns full IP when fewer than 2 octets are shared', () => {
    expect(abbreviateEndIp('10.0.1.1', '192.168.1.254')).toBe('192.168.1.254')
  })

  it('returns full IP when only first octet is shared', () => {
    expect(abbreviateEndIp('10.0.1.1', '10.5.1.1')).toBe('10.5.1.1')
  })
})

describe('rangeIpCount', () => {
  it('counts 10 IPs in 10.0.0.1–10.0.0.10', () => {
    expect(rangeIpCount('10.0.0.1', '10.0.0.10')).toBe(10)
  })

  it('counts 1 for single-host range', () => {
    expect(rangeIpCount('192.168.1.5', '192.168.1.5')).toBe(1)
  })

  it('counts correctly across octet boundary', () => {
    expect(rangeIpCount('10.0.0.250', '10.0.1.5')).toBe(12)
  })
})

describe('isValidIPv4', () => {
  it('accepts a well-formed address', () => {
    expect(isValidIPv4('10.0.1.50')).toBe(true)
  })

  it('rejects a partial address', () => {
    expect(isValidIPv4('10.0')).toBe(false)
  })

  it('rejects an octet out of range', () => {
    expect(isValidIPv4('10.0.0.256')).toBe(false)
  })

  it('rejects non-numeric octets and leading zeros', () => {
    expect(isValidIPv4('10.0.0.x')).toBe(false)
    expect(isValidIPv4('10.0.0.01')).toBe(false)
  })
})

describe('isIPInSubnet', () => {
  it('returns true for an IP inside the subnet', () => {
    expect(isIPInSubnet('10.0.1.50', '10.0.1.0/24')).toBe(true)
  })

  it('returns false for an IP outside the subnet', () => {
    expect(isIPInSubnet('10.0.2.50', '10.0.1.0/24')).toBe(false)
  })

  it('handles /31 point-to-point subnets', () => {
    expect(isIPInSubnet('10.0.0.1', '10.0.0.0/31')).toBe(true)
    expect(isIPInSubnet('10.0.0.2', '10.0.0.0/31')).toBe(false)
  })
})

describe('findNetworkForIP', () => {
  const networks = [
    { id: 'a', subnet: '10.0.1.0/24' },
    { id: 'b', subnet: '10.0.2.0/24' }
  ]

  it('finds the matching network', () => {
    expect(findNetworkForIP('10.0.2.5', networks)?.id).toBe('b')
  })

  it('returns null when no subnet contains the IP', () => {
    expect(findNetworkForIP('192.168.0.5', networks)).toBeNull()
  })

  it('returns null for invalid or partial input', () => {
    expect(findNetworkForIP('10.0', networks)).toBeNull()
    expect(findNetworkForIP('', networks)).toBeNull()
  })

  it('returns the first matching network when subnets overlap', () => {
    const overlap = [
      { id: 'first', subnet: '10.0.0.0/8' },
      { id: 'second', subnet: '10.0.1.0/24' }
    ]
    expect(findNetworkForIP('10.0.1.5', overlap)?.id).toBe('first')
  })
})
