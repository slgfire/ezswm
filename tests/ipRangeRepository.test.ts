import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'
import { ipRangeRepository } from '../server/repositories/ipRangeRepository'
import type { Network } from '../types/network'

describe('ipRangeRepository', () => {
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

  const testNetwork31: Network = {
    ...testNetwork,
    id: 'net-31',
    subnet: '10.0.0.0/31',
  }

  const testNetwork32: Network = {
    ...testNetwork,
    id: 'net-32',
    subnet: '10.0.0.1/32',
  }

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'networks.json', [testNetwork, testNetwork31, testNetwork32])
    seedJsonFile(tempDir, 'ipRanges.json', [])
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  describe('create', () => {
    it('creates a valid range', () => {
      const result = ipRangeRepository.create('net-1', {
        start_ip: '10.0.1.10',
        end_ip: '10.0.1.50',
        type: 'dhcp',
      })
      expect(result.id).toBeTruthy()
      expect(result.start_ip).toBe('10.0.1.10')
      expect(result.end_ip).toBe('10.0.1.50')
      expect(result.type).toBe('dhcp')
    })

    it('rejects start > end', () => {
      try {
        ipRangeRepository.create('net-1', {
          start_ip: '10.0.1.100',
          end_ip: '10.0.1.10',
          type: 'static',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/less than/)
      }
    })

    it('rejects range outside subnet', () => {
      try {
        ipRangeRepository.create('net-1', {
          start_ip: '192.168.1.10',
          end_ip: '192.168.1.50',
          type: 'static',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('rejects overlapping ranges', () => {
      ipRangeRepository.create('net-1', {
        start_ip: '10.0.1.10',
        end_ip: '10.0.1.50',
        type: 'dhcp',
      })
      try {
        ipRangeRepository.create('net-1', {
          start_ip: '10.0.1.40',
          end_ip: '10.0.1.80',
          type: 'static',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(409)
        expect((error as Error).message).toMatch(/overlaps/)
      }
    })

    it('rejects DHCP range on /31 network', () => {
      try {
        ipRangeRepository.create('net-31', {
          start_ip: '10.0.0.0',
          end_ip: '10.0.0.1',
          type: 'dhcp',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/point-to-point/)
      }
    })

    it('rejects DHCP range on /32 network', () => {
      try {
        ipRangeRepository.create('net-32', {
          start_ip: '10.0.0.1',
          end_ip: '10.0.0.1',
          type: 'dhcp',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/host-route/)
      }
    })

    it('allows static range on /31 network', () => {
      const result = ipRangeRepository.create('net-31', {
        start_ip: '10.0.0.0',
        end_ip: '10.0.0.1',
        type: 'static',
      })
      expect(result.id).toBeTruthy()
    })

    it('rejects unknown network', () => {
      try {
        ipRangeRepository.create('nonexistent', {
          start_ip: '10.0.1.10',
          end_ip: '10.0.1.50',
          type: 'dhcp',
        })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(404)
      }
    })
  })

  describe('update', () => {
    it('updates range excluding self from overlap check', () => {
      const created = ipRangeRepository.create('net-1', {
        start_ip: '10.0.1.10',
        end_ip: '10.0.1.50',
        type: 'dhcp',
      })
      const updated = ipRangeRepository.update(created.id, { end_ip: '10.0.1.60' })
      expect(updated.end_ip).toBe('10.0.1.60')
    })
  })

  describe('delete', () => {
    it('removes range', () => {
      const created = ipRangeRepository.create('net-1', {
        start_ip: '10.0.1.10',
        end_ip: '10.0.1.50',
        type: 'dhcp',
      })
      expect(ipRangeRepository.delete(created.id)).toBe(true)
      expect(ipRangeRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', () => {
      expect(ipRangeRepository.delete('nonexistent')).toBe(false)
    })
  })
})
