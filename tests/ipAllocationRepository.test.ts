import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'
import { ipAllocationRepository } from '../server/repositories/ipAllocationRepository'
import type { Network } from '../types/network'
import type { IPRange } from '../types/ipRange'

describe('ipAllocationRepository', () => {
  let tempDir: string

  const testNetwork: Network = {
    id: 'net-1',
    site_id: 'site-1',
    name: 'Test Network',
    subnet: '10.0.1.0/24',
    gateway: '10.0.1.1',
    dns_servers: [],
    is_favorite: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const testNetwork2: Network = {
    ...testNetwork,
    id: 'net-2',
    name: 'Second Network',
    subnet: '10.0.2.0/24',
  }

  const dhcpRange: IPRange = {
    id: 'range-1',
    network_id: 'net-1',
    start_ip: '10.0.1.100',
    end_ip: '10.0.1.200',
    type: 'dhcp',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'networks.json', [testNetwork, testNetwork2])
    seedJsonFile(tempDir, 'ipRanges.json', [dhcpRange])
    seedJsonFile(tempDir, 'ipAllocations.json', [])
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  describe('create', () => {
    it('creates allocation with valid IP', () => {
      const result = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.10',
        status: 'active',
      })
      expect(result.id).toBeTruthy()
      expect(result.ip_address).toBe('10.0.1.10')
      expect(result.network_id).toBe('net-1')
    })

    it('rejects invalid IP address', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: 'not-an-ip',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/Invalid IP/)
      }
    })

    it('rejects IP outside subnet', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: '192.168.1.5',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('rejects network address', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: '10.0.1.0',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/network/)
      }
    })

    it('rejects broadcast address', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: '10.0.1.255',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/broadcast/)
      }
    })

    it('rejects duplicate IP in same network', () => {
      ipAllocationRepository.create('net-1', { ip_address: '10.0.1.10', status: 'active' })
      try {
        ipAllocationRepository.create('net-1', { ip_address: '10.0.1.10', status: 'active' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(409)
        expect((error as Error).message).toMatch(/already allocated/)
      }
    })

    it('rejects invalid MAC address format', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: '10.0.1.10',
          mac_address: 'invalid-mac',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/MAC/)
      }
    })

    it('accepts valid MAC address', () => {
      const result = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.10',
        mac_address: 'AA:BB:CC:DD:EE:FF',
        status: 'active',
      })
      expect(result.mac_address).toBe('AA:BB:CC:DD:EE:FF')
    })

    it('rejects IP inside DHCP range', () => {
      try {
        ipAllocationRepository.create('net-1', {
          ip_address: '10.0.1.150',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/DHCP/)
      }
    })

    it('accepts IP outside DHCP range', () => {
      const result = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.50',
        status: 'active',
      })
      expect(result.ip_address).toBe('10.0.1.50')
    })

    it('rejects unknown network', () => {
      try {
        ipAllocationRepository.create('nonexistent', {
          ip_address: '10.0.1.10',
          status: 'active',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(404)
      }
    })
  })

  describe('update', () => {
    it('updates allocation', () => {
      const created = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.10',
        status: 'active',
      })
      const updated = ipAllocationRepository.update(created.id, { hostname: 'server-1' })
      expect(updated.hostname).toBe('server-1')
      expect(updated.ip_address).toBe('10.0.1.10')
    })

    it('rejects invalid MAC on update', () => {
      const created = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.10',
        status: 'active',
      })
      try {
        ipAllocationRepository.update(created.id, { mac_address: 'bad' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })
  })

  describe('delete', () => {
    it('removes allocation', () => {
      const created = ipAllocationRepository.create('net-1', {
        ip_address: '10.0.1.10',
        status: 'active',
      })
      expect(ipAllocationRepository.delete(created.id)).toBe(true)
      expect(ipAllocationRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', () => {
      expect(ipAllocationRepository.delete('nonexistent')).toBe(false)
    })
  })
})
