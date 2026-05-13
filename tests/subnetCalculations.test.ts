import {
  ipToLong,
  parseSubnetInfo,
  abbreviateEndIp,
  rangeIpCount,
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
