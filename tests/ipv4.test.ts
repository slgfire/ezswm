import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
  doRangesOverlap
} from '../server/utils/ipv4'

describe('ipToLong / longToIp', () => {
  it('converts 0.0.0.0 to 0', () => {
    assert.equal(ipToLong('0.0.0.0'), 0)
  })

  it('converts 255.255.255.255 to 4294967295', () => {
    assert.equal(ipToLong('255.255.255.255'), 4294967295)
  })

  it('converts 10.0.1.50 correctly', () => {
    assert.equal(ipToLong('10.0.1.50'), (10 << 24 | 0 << 16 | 1 << 8 | 50) >>> 0)
  })

  it('round-trips through longToIp', () => {
    const ips = ['10.0.1.50', '192.168.1.1', '172.16.0.1', '255.255.255.255', '0.0.0.0']
    for (const ip of ips) {
      assert.equal(longToIp(ipToLong(ip)), ip)
    }
  })
})

describe('isValidIPv4', () => {
  it('accepts valid IPs', () => {
    assert.ok(isValidIPv4('10.0.1.50'))
    assert.ok(isValidIPv4('0.0.0.0'))
    assert.ok(isValidIPv4('255.255.255.255'))
  })

  it('rejects invalid IPs', () => {
    assert.ok(!isValidIPv4('256.0.0.1'))
    assert.ok(!isValidIPv4('10.0.1'))
    assert.ok(!isValidIPv4('10.0.1.1.1'))
    assert.ok(!isValidIPv4('abc.def.ghi.jkl'))
    assert.ok(!isValidIPv4('10.0.01.1')) // leading zero
  })
})

describe('isValidCIDR', () => {
  it('accepts valid CIDR', () => {
    assert.ok(isValidCIDR('10.0.0.0/8'))
    assert.ok(isValidCIDR('10.10.10.0/23'))
    assert.ok(isValidCIDR('192.168.1.0/24'))
    assert.ok(isValidCIDR('0.0.0.0/0'))
    assert.ok(isValidCIDR('10.0.0.1/32'))
  })

  it('rejects invalid CIDR', () => {
    assert.ok(!isValidCIDR('10.0.0.0'))
    assert.ok(!isValidCIDR('10.0.0.0/33'))
    assert.ok(!isValidCIDR('10.0.0.0/-1'))
    assert.ok(!isValidCIDR('invalid/24'))
  })
})

describe('isIPInSubnet - CIDR bitwise correctness', () => {
  it('10.10.11.15 is valid for 10.10.10.0/23', () => {
    assert.ok(isIPInSubnet('10.10.11.15', '10.10.10.0/23'))
  })

  it('10.10.12.5 is invalid for 10.10.10.0/23', () => {
    assert.ok(!isIPInSubnet('10.10.12.5', '10.10.10.0/23'))
  })

  it('handles /24 subnet correctly', () => {
    assert.ok(isIPInSubnet('192.168.1.1', '192.168.1.0/24'))
    assert.ok(isIPInSubnet('192.168.1.254', '192.168.1.0/24'))
    assert.ok(!isIPInSubnet('192.168.2.1', '192.168.1.0/24'))
  })

  it('handles /16 subnet correctly', () => {
    assert.ok(isIPInSubnet('172.16.0.1', '172.16.0.0/16'))
    assert.ok(isIPInSubnet('172.16.255.254', '172.16.0.0/16'))
    assert.ok(!isIPInSubnet('172.17.0.1', '172.16.0.0/16'))
  })

  it('handles /8 subnet correctly', () => {
    assert.ok(isIPInSubnet('10.255.255.254', '10.0.0.0/8'))
    assert.ok(!isIPInSubnet('11.0.0.1', '10.0.0.0/8'))
  })

  it('handles /32 subnet (single host)', () => {
    assert.ok(isIPInSubnet('10.0.0.1', '10.0.0.1/32'))
    assert.ok(!isIPInSubnet('10.0.0.2', '10.0.0.1/32'))
  })

  it('handles /31 subnet (point-to-point)', () => {
    assert.ok(isIPInSubnet('10.0.0.0', '10.0.0.0/31'))
    assert.ok(isIPInSubnet('10.0.0.1', '10.0.0.0/31'))
    assert.ok(!isIPInSubnet('10.0.0.2', '10.0.0.0/31'))
  })

  it('handles /0 subnet (everything)', () => {
    assert.ok(isIPInSubnet('1.2.3.4', '0.0.0.0/0'))
    assert.ok(isIPInSubnet('255.255.255.255', '0.0.0.0/0'))
  })

  it('network address is in subnet', () => {
    assert.ok(isIPInSubnet('10.0.1.0', '10.0.1.0/24'))
  })

  it('broadcast address is in subnet', () => {
    assert.ok(isIPInSubnet('10.0.1.255', '10.0.1.0/24'))
  })

  it('handles /25 correctly', () => {
    assert.ok(isIPInSubnet('192.168.1.1', '192.168.1.0/25'))
    assert.ok(isIPInSubnet('192.168.1.126', '192.168.1.0/25'))
    assert.ok(!isIPInSubnet('192.168.1.128', '192.168.1.0/25'))
  })

  it('handles /22 correctly (4 class-C blocks)', () => {
    assert.ok(isIPInSubnet('10.0.0.1', '10.0.0.0/22'))
    assert.ok(isIPInSubnet('10.0.1.1', '10.0.0.0/22'))
    assert.ok(isIPInSubnet('10.0.2.1', '10.0.0.0/22'))
    assert.ok(isIPInSubnet('10.0.3.254', '10.0.0.0/22'))
    assert.ok(!isIPInSubnet('10.0.4.1', '10.0.0.0/22'))
  })

  it('handles non-zero host bits in CIDR (normalizes correctly)', () => {
    // 10.10.10.5/23 should be treated as 10.10.10.0/23
    assert.ok(isIPInSubnet('10.10.11.15', '10.10.10.5/23'))
  })
})

describe('isUsableHostIP', () => {
  it('rejects network address for /24', () => {
    assert.ok(!isUsableHostIP('10.0.1.0', '10.0.1.0/24'))
  })

  it('rejects broadcast address for /24', () => {
    assert.ok(!isUsableHostIP('10.0.1.255', '10.0.1.0/24'))
  })

  it('accepts first usable host for /24', () => {
    assert.ok(isUsableHostIP('10.0.1.1', '10.0.1.0/24'))
  })

  it('accepts last usable host for /24', () => {
    assert.ok(isUsableHostIP('10.0.1.254', '10.0.1.0/24'))
  })

  it('accepts mid-range host for /23', () => {
    assert.ok(isUsableHostIP('10.10.11.15', '10.10.10.0/23'))
  })

  it('rejects network address for /23', () => {
    assert.ok(!isUsableHostIP('10.10.10.0', '10.10.10.0/23'))
  })

  it('rejects broadcast address for /23', () => {
    assert.ok(!isUsableHostIP('10.10.11.255', '10.10.10.0/23'))
  })

  it('rejects IP outside subnet', () => {
    assert.ok(!isUsableHostIP('10.10.12.5', '10.10.10.0/23'))
  })

  it('accepts all addresses for /31 (RFC 3021)', () => {
    assert.ok(isUsableHostIP('10.0.0.0', '10.0.0.0/31'))
    assert.ok(isUsableHostIP('10.0.0.1', '10.0.0.0/31'))
  })

  it('accepts the single address for /32', () => {
    assert.ok(isUsableHostIP('10.0.0.1', '10.0.0.1/32'))
  })
})

describe('parseSubnet', () => {
  it('parses /24 correctly', () => {
    const info = parseSubnet('192.168.1.0/24')
    assert.equal(info.network_address, '192.168.1.0')
    assert.equal(info.broadcast_address, '192.168.1.255')
    assert.equal(info.subnet_mask, '255.255.255.0')
    assert.equal(info.first_usable, '192.168.1.1')
    assert.equal(info.last_usable, '192.168.1.254')
    assert.equal(info.total_hosts, 256)
    assert.equal(info.usable_hosts, 254)
    assert.equal(info.prefix_length, 24)
  })

  it('parses /23 correctly', () => {
    const info = parseSubnet('10.10.10.0/23')
    assert.equal(info.network_address, '10.10.10.0')
    assert.equal(info.broadcast_address, '10.10.11.255')
    assert.equal(info.subnet_mask, '255.255.254.0')
    assert.equal(info.first_usable, '10.10.10.1')
    assert.equal(info.last_usable, '10.10.11.254')
    assert.equal(info.total_hosts, 512)
    assert.equal(info.usable_hosts, 510)
  })

  it('parses /32 correctly', () => {
    const info = parseSubnet('10.0.0.1/32')
    assert.equal(info.network_address, '10.0.0.1')
    assert.equal(info.broadcast_address, '10.0.0.1')
    assert.equal(info.total_hosts, 1)
  })
})

describe('subnetRangeError', () => {
  it('produces helpful error message for /23', () => {
    const msg = subnetRangeError('10.10.12.5', '10.10.10.0/23')
    assert.ok(msg.includes('10.10.12.5'))
    assert.ok(msg.includes('10.10.10.0/23'))
    assert.ok(msg.includes('10.10.10.1'))
    assert.ok(msg.includes('10.10.11.254'))
  })

  it('produces helpful error message for /24', () => {
    const msg = subnetRangeError('192.168.2.1', '192.168.1.0/24')
    assert.ok(msg.includes('192.168.2.1'))
    assert.ok(msg.includes('192.168.1.0/24'))
    assert.ok(msg.includes('192.168.1.1'))
    assert.ok(msg.includes('192.168.1.254'))
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
    assert.equal(result?.id, 'net1')
  })

  it('finds /23 network for IP in second octet range', () => {
    const result = findNetworkForIP('10.10.11.15', networks)
    assert.equal(result?.id, 'net2')
  })

  it('returns null for IP not in any network', () => {
    const result = findNetworkForIP('172.16.0.1', networks)
    assert.equal(result, null)
  })
})

describe('doRangesOverlap', () => {
  it('detects overlap', () => {
    assert.ok(doRangesOverlap('10.0.1.1', '10.0.1.100', '10.0.1.50', '10.0.1.200'))
  })

  it('detects no overlap', () => {
    assert.ok(!doRangesOverlap('10.0.1.1', '10.0.1.49', '10.0.1.50', '10.0.1.200'))
  })

  it('detects touching ranges as overlapping', () => {
    assert.ok(doRangesOverlap('10.0.1.1', '10.0.1.50', '10.0.1.50', '10.0.1.200'))
  })
})
