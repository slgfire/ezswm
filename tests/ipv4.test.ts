import {
  ipToLong,
  longToIp,
  isValidIPv4,
  isValidCIDR,
  isIPInSubnet,
  isUsableHostIP,
  parseSubnet,
  subnetRangeError,
  findNetworkForIP,
  doRangesOverlap,
  isValidMacAddress
} from '../server/utils/ipv4'

describe('ipToLong / longToIp', () => {
  it('converts 0.0.0.0 to 0', () => {
    expect(ipToLong('0.0.0.0')).toBe(0)
  })

  it('converts 255.255.255.255 to 4294967295', () => {
    expect(ipToLong('255.255.255.255')).toBe(4294967295)
  })

  it('converts 10.0.1.50 correctly', () => {
    expect(ipToLong('10.0.1.50')).toBe((10 << 24 | 0 << 16 | 1 << 8 | 50) >>> 0)
  })

  it('round-trips through longToIp', () => {
    const ips = ['10.0.1.50', '192.168.1.1', '172.16.0.1', '255.255.255.255', '0.0.0.0']
    for (const ip of ips) {
      expect(longToIp(ipToLong(ip))).toBe(ip)
    }
  })
})

describe('isValidIPv4', () => {
  it('accepts valid IPs', () => {
    expect(isValidIPv4('10.0.1.50')).toBeTruthy()
    expect(isValidIPv4('0.0.0.0')).toBeTruthy()
    expect(isValidIPv4('255.255.255.255')).toBeTruthy()
  })

  it('rejects invalid IPs', () => {
    expect(isValidIPv4('256.0.0.1')).toBeFalsy()
    expect(isValidIPv4('10.0.1')).toBeFalsy()
    expect(isValidIPv4('10.0.1.1.1')).toBeFalsy()
    expect(isValidIPv4('abc.def.ghi.jkl')).toBeFalsy()
    expect(isValidIPv4('10.0.01.1')).toBeFalsy() // leading zero
  })
})

describe('isValidCIDR', () => {
  it('accepts valid CIDR', () => {
    expect(isValidCIDR('10.0.0.0/8')).toBeTruthy()
    expect(isValidCIDR('10.10.10.0/23')).toBeTruthy()
    expect(isValidCIDR('192.168.1.0/24')).toBeTruthy()
    expect(isValidCIDR('0.0.0.0/0')).toBeTruthy()
    expect(isValidCIDR('10.0.0.1/32')).toBeTruthy()
  })

  it('rejects invalid CIDR', () => {
    expect(isValidCIDR('10.0.0.0')).toBeFalsy()
    expect(isValidCIDR('10.0.0.0/33')).toBeFalsy()
    expect(isValidCIDR('10.0.0.0/-1')).toBeFalsy()
    expect(isValidCIDR('invalid/24')).toBeFalsy()
  })
})

describe('isIPInSubnet - CIDR bitwise correctness', () => {
  it('10.10.11.15 is valid for 10.10.10.0/23', () => {
    expect(isIPInSubnet('10.10.11.15', '10.10.10.0/23')).toBeTruthy()
  })

  it('10.10.12.5 is invalid for 10.10.10.0/23', () => {
    expect(isIPInSubnet('10.10.12.5', '10.10.10.0/23')).toBeFalsy()
  })

  it('handles /24 subnet correctly', () => {
    expect(isIPInSubnet('192.168.1.1', '192.168.1.0/24')).toBeTruthy()
    expect(isIPInSubnet('192.168.1.254', '192.168.1.0/24')).toBeTruthy()
    expect(isIPInSubnet('192.168.2.1', '192.168.1.0/24')).toBeFalsy()
  })

  it('handles /16 subnet correctly', () => {
    expect(isIPInSubnet('172.16.0.1', '172.16.0.0/16')).toBeTruthy()
    expect(isIPInSubnet('172.16.255.254', '172.16.0.0/16')).toBeTruthy()
    expect(isIPInSubnet('172.17.0.1', '172.16.0.0/16')).toBeFalsy()
  })

  it('handles /8 subnet correctly', () => {
    expect(isIPInSubnet('10.255.255.254', '10.0.0.0/8')).toBeTruthy()
    expect(isIPInSubnet('11.0.0.1', '10.0.0.0/8')).toBeFalsy()
  })

  it('handles /32 subnet (single host)', () => {
    expect(isIPInSubnet('10.0.0.1', '10.0.0.1/32')).toBeTruthy()
    expect(isIPInSubnet('10.0.0.2', '10.0.0.1/32')).toBeFalsy()
  })

  it('handles /31 subnet (point-to-point)', () => {
    expect(isIPInSubnet('10.0.0.0', '10.0.0.0/31')).toBeTruthy()
    expect(isIPInSubnet('10.0.0.1', '10.0.0.0/31')).toBeTruthy()
    expect(isIPInSubnet('10.0.0.2', '10.0.0.0/31')).toBeFalsy()
  })

  it('handles /0 subnet (everything)', () => {
    expect(isIPInSubnet('1.2.3.4', '0.0.0.0/0')).toBeTruthy()
    expect(isIPInSubnet('255.255.255.255', '0.0.0.0/0')).toBeTruthy()
  })

  it('network address is in subnet', () => {
    expect(isIPInSubnet('10.0.1.0', '10.0.1.0/24')).toBeTruthy()
  })

  it('broadcast address is in subnet', () => {
    expect(isIPInSubnet('10.0.1.255', '10.0.1.0/24')).toBeTruthy()
  })

  it('handles /25 correctly', () => {
    expect(isIPInSubnet('192.168.1.1', '192.168.1.0/25')).toBeTruthy()
    expect(isIPInSubnet('192.168.1.126', '192.168.1.0/25')).toBeTruthy()
    expect(isIPInSubnet('192.168.1.128', '192.168.1.0/25')).toBeFalsy()
  })

  it('handles /22 correctly (4 class-C blocks)', () => {
    expect(isIPInSubnet('10.0.0.1', '10.0.0.0/22')).toBeTruthy()
    expect(isIPInSubnet('10.0.1.1', '10.0.0.0/22')).toBeTruthy()
    expect(isIPInSubnet('10.0.2.1', '10.0.0.0/22')).toBeTruthy()
    expect(isIPInSubnet('10.0.3.254', '10.0.0.0/22')).toBeTruthy()
    expect(isIPInSubnet('10.0.4.1', '10.0.0.0/22')).toBeFalsy()
  })

  it('handles non-zero host bits in CIDR (normalizes correctly)', () => {
    // 10.10.10.5/23 should be treated as 10.10.10.0/23
    expect(isIPInSubnet('10.10.11.15', '10.10.10.5/23')).toBeTruthy()
  })
})

describe('isUsableHostIP', () => {
  it('rejects network address for /24', () => {
    expect(isUsableHostIP('10.0.1.0', '10.0.1.0/24')).toBeFalsy()
  })

  it('rejects broadcast address for /24', () => {
    expect(isUsableHostIP('10.0.1.255', '10.0.1.0/24')).toBeFalsy()
  })

  it('accepts first usable host for /24', () => {
    expect(isUsableHostIP('10.0.1.1', '10.0.1.0/24')).toBeTruthy()
  })

  it('accepts last usable host for /24', () => {
    expect(isUsableHostIP('10.0.1.254', '10.0.1.0/24')).toBeTruthy()
  })

  it('accepts mid-range host for /23', () => {
    expect(isUsableHostIP('10.10.11.15', '10.10.10.0/23')).toBeTruthy()
  })

  it('rejects network address for /23', () => {
    expect(isUsableHostIP('10.10.10.0', '10.10.10.0/23')).toBeFalsy()
  })

  it('rejects broadcast address for /23', () => {
    expect(isUsableHostIP('10.10.11.255', '10.10.10.0/23')).toBeFalsy()
  })

  it('rejects IP outside subnet', () => {
    expect(isUsableHostIP('10.10.12.5', '10.10.10.0/23')).toBeFalsy()
  })

  it('accepts all addresses for /31 (RFC 3021)', () => {
    expect(isUsableHostIP('10.0.0.0', '10.0.0.0/31')).toBeTruthy()
    expect(isUsableHostIP('10.0.0.1', '10.0.0.0/31')).toBeTruthy()
  })

  it('accepts the single address for /32', () => {
    expect(isUsableHostIP('10.0.0.1', '10.0.0.1/32')).toBeTruthy()
  })
})

describe('parseSubnet', () => {
  it('parses /24 correctly', () => {
    const info = parseSubnet('192.168.1.0/24')
    expect(info.network_address).toBe('192.168.1.0')
    expect(info.broadcast_address).toBe('192.168.1.255')
    expect(info.subnet_mask).toBe('255.255.255.0')
    expect(info.first_usable).toBe('192.168.1.1')
    expect(info.last_usable).toBe('192.168.1.254')
    expect(info.total_hosts).toBe(256)
    expect(info.usable_hosts).toBe(254)
    expect(info.prefix_length).toBe(24)
  })

  it('parses /23 correctly', () => {
    const info = parseSubnet('10.10.10.0/23')
    expect(info.network_address).toBe('10.10.10.0')
    expect(info.broadcast_address).toBe('10.10.11.255')
    expect(info.subnet_mask).toBe('255.255.254.0')
    expect(info.first_usable).toBe('10.10.10.1')
    expect(info.last_usable).toBe('10.10.11.254')
    expect(info.total_hosts).toBe(512)
    expect(info.usable_hosts).toBe(510)
  })

  it('parses /32 correctly', () => {
    const info = parseSubnet('10.0.0.1/32')
    expect(info.network_address).toBe('10.0.0.1')
    expect(info.broadcast_address).toBe('10.0.0.1')
    expect(info.total_hosts).toBe(1)
  })
})

describe('subnetRangeError', () => {
  it('produces helpful error message for /23', () => {
    const msg = subnetRangeError('10.10.12.5', '10.10.10.0/23')
    expect(msg).toMatch('10.10.12.5')
    expect(msg).toMatch('10.10.10.0/23')
    expect(msg).toMatch('10.10.10.1')
    expect(msg).toMatch('10.10.11.254')
  })

  it('produces helpful error message for /24', () => {
    const msg = subnetRangeError('192.168.2.1', '192.168.1.0/24')
    expect(msg).toMatch('192.168.2.1')
    expect(msg).toMatch('192.168.1.0/24')
    expect(msg).toMatch('192.168.1.1')
    expect(msg).toMatch('192.168.1.254')
  })
})

describe('findNetworkForIP', () => {
  const networks = [
    { id: 'net1', subnet: '10.0.1.0/24' },
    { id: 'net2', subnet: '10.10.10.0/23' },
    { id: 'net3', subnet: '192.168.1.0/24' }
  ]

  it('finds matching network for IP', () => {
    const result = findNetworkForIP('10.0.1.50', networks)
    expect(result?.id).toBe('net1')
  })

  it('finds /23 network for IP in second octet range', () => {
    const result = findNetworkForIP('10.10.11.15', networks)
    expect(result?.id).toBe('net2')
  })

  it('returns null for IP not in any network', () => {
    const result = findNetworkForIP('172.16.0.1', networks)
    expect(result).toBe(null)
  })
})

describe('doRangesOverlap', () => {
  it('detects overlap', () => {
    expect(doRangesOverlap('10.0.1.1', '10.0.1.100', '10.0.1.50', '10.0.1.200')).toBeTruthy()
  })

  it('detects no overlap', () => {
    expect(doRangesOverlap('10.0.1.1', '10.0.1.49', '10.0.1.50', '10.0.1.200')).toBeFalsy()
  })

  it('detects touching ranges as overlapping', () => {
    expect(doRangesOverlap('10.0.1.1', '10.0.1.50', '10.0.1.50', '10.0.1.200')).toBeTruthy()
  })
})

describe('isValidMacAddress', () => {
  it('accepts valid uppercase MAC', () => {
    expect(isValidMacAddress('AA:BB:CC:DD:EE:FF')).toBeTruthy()
  })
  it('accepts valid lowercase MAC', () => {
    expect(isValidMacAddress('aa:bb:cc:dd:ee:ff')).toBeTruthy()
  })
  it('accepts valid mixed-case MAC', () => {
    expect(isValidMacAddress('aA:bB:cC:dD:eE:fF')).toBeTruthy()
  })
  it('rejects dash separators', () => {
    expect(isValidMacAddress('AA-BB-CC-DD-EE-FF')).toBeFalsy()
  })
  it('rejects dot separators', () => {
    expect(isValidMacAddress('AABB.CCDD.EEFF')).toBeFalsy()
  })
  it('rejects too short', () => {
    expect(isValidMacAddress('AA:BB:CC:DD:EE')).toBeFalsy()
  })
  it('rejects too long', () => {
    expect(isValidMacAddress('AA:BB:CC:DD:EE:FF:00')).toBeFalsy()
  })
  it('rejects non-hex characters', () => {
    expect(isValidMacAddress('GG:HH:II:JJ:KK:LL')).toBeFalsy()
  })
  it('rejects empty string', () => {
    expect(isValidMacAddress('')).toBeFalsy()
  })
})
