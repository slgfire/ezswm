import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'
import { networkRepository } from '../server/repositories/networkRepository'

describe('networkRepository', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'networks.json', [])
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  const validNetwork = {
    site_id: 'site-1',
    name: 'Test Network',
    subnet: '10.0.1.0/24',
    gateway: '10.0.1.1',
    dns_servers: ['8.8.8.8'],
    is_favorite: false,
  }

  describe('create', () => {
    it('creates network with valid CIDR', () => {
      const result = networkRepository.create(validNetwork)
      expect(result.id).toBeTruthy()
      expect(result.name).toBe('Test Network')
      expect(result.subnet).toBe('10.0.1.0/24')
      expect(result.created_at).toBeTruthy()
    })

    it('rejects invalid CIDR', () => {
      try {
        networkRepository.create({ ...validNetwork, subnet: 'not-a-cidr' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('rejects gateway outside subnet', () => {
      try {
        networkRepository.create({ ...validNetwork, gateway: '192.168.1.1' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/Gateway/)
      }
    })

    it('rejects invalid gateway IP', () => {
      try {
        networkRepository.create({ ...validNetwork, gateway: '999.999.999.999' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('rejects invalid DNS server IP', () => {
      try {
        networkRepository.create({ ...validNetwork, dns_servers: ['not-an-ip'] })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
        expect((error as Error).message).toMatch(/DNS/)
      }
    })

    it('accepts network without gateway', () => {
      const result = networkRepository.create({ ...validNetwork, gateway: undefined })
      expect(result.id).toBeTruthy()
    })

    it('accepts network with empty dns_servers', () => {
      const result = networkRepository.create({ ...validNetwork, dns_servers: [] })
      expect(result.dns_servers).toEqual([])
    })
  })

  describe('getById', () => {
    it('returns network by id', () => {
      const created = networkRepository.create(validNetwork)
      const found = networkRepository.getById(created.id)
      expect(found).toBeTruthy()
      expect(found!.id).toBe(created.id)
    })

    it('returns null for unknown id', () => {
      expect(networkRepository.getById('nonexistent')).toBe(null)
    })
  })

  describe('delete', () => {
    it('removes network', () => {
      const created = networkRepository.create(validNetwork)
      expect(networkRepository.delete(created.id)).toBe(true)
      expect(networkRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', () => {
      expect(networkRepository.delete('nonexistent')).toBe(false)
    })
  })
})
