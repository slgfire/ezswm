import { describe, expect, it } from 'vitest'
import { getLagEligibleSelectedPortIds } from '../app/utils/lagPortOptions'

describe('LAG port selection', () => {
  it('requires two eligible selected ports and passes only those IDs to creation', () => {
    const ports = [
      { id: 'console', type: 'console', label: 'Console' },
      { id: 'mgmt', type: 'management', label: 'Management' },
      { id: 'eth-1', type: 'rj45', label: 'Ethernet 1' },
      { id: 'eth-2', type: 'rj45', label: 'Ethernet 2' }
    ]

    const managementOnly = getLagEligibleSelectedPortIds(['console', 'mgmt'], ports)
    const mixed = getLagEligibleSelectedPortIds(['console', 'eth-1', 'eth-2'], ports)
    expect(managementOnly).toHaveLength(0)
    expect(managementOnly.length >= 2).toBe(false)
    expect(mixed).toEqual(['eth-1', 'eth-2'])
    expect(mixed.length >= 2).toBe(true)
  })
})
