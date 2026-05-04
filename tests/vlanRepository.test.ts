import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTestRuntimeConfig, resetTestRuntimeConfig, seedJsonFile } from './testHelpers'
import { vlanRepository } from '../server/repositories/vlanRepository'

describe('vlanRepository', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-'))
    setTestRuntimeConfig({ dataDir: tempDir })
    seedJsonFile(tempDir, 'vlans.json', [])
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    resetTestRuntimeConfig()
  })

  const validVlan = {
    site_id: 'site-1',
    vlan_id: 100,
    name: 'Management',
    status: 'active' as const,
    color: '#EF4444',
  }

  describe('create', () => {
    it('creates VLAN and returns it with id', () => {
      const result = vlanRepository.create(validVlan)
      expect(result.id).toBeTruthy()
      expect(result.vlan_id).toBe(100)
      expect(result.name).toBe('Management')
      expect(result.is_favorite).toBe(false)
      expect(result.created_at).toBeTruthy()
    })

    it('rejects duplicate VLAN ID in same site', () => {
      vlanRepository.create(validVlan)
      try {
        vlanRepository.create({ ...validVlan, color: '#F97316' })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(409)
        expect((error as Error).message).toMatch(/VLAN ID 100/)
      }
    })

    it('allows same VLAN ID in different sites', () => {
      vlanRepository.create(validVlan)
      const result = vlanRepository.create({ ...validVlan, site_id: 'site-2', color: '#F97316' })
      expect(result.id).toBeTruthy()
      expect(result.site_id).toBe('site-2')
    })

    it('rejects duplicate color in same site', () => {
      vlanRepository.create(validVlan)
      try {
        vlanRepository.create({ ...validVlan, vlan_id: 200 })
        expect.fail('Expected to throw')
      } catch (error) {
        expect((error as { statusCode?: number }).statusCode).toBe(409)
        expect((error as Error).message).toMatch(/Color/)
      }
    })
  })

  describe('getNextAvailableColor', () => {
    it('returns first pool color when no VLANs exist', () => {
      const color = vlanRepository.getNextAvailableColor()
      expect(color).toBe('#EF4444')
    })

    it('returns second pool color when first is taken', () => {
      vlanRepository.create(validVlan)
      const color = vlanRepository.getNextAvailableColor()
      expect(color).toBe('#F97316')
    })
  })

  describe('delete', () => {
    it('removes VLAN', () => {
      const created = vlanRepository.create(validVlan)
      expect(vlanRepository.delete(created.id)).toBe(true)
      expect(vlanRepository.getById(created.id)).toBe(null)
    })

    it('returns false for unknown id', () => {
      expect(vlanRepository.delete('nonexistent')).toBe(false)
    })
  })
})
