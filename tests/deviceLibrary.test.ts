import {
  mapNetboxType,
  mapNetboxPoe,
  groupInterfacesToBlocks,
  convertNetboxToTemplate,
  incrementMemberLabel
} from '../server/utils/deviceLibrary'

// ---------------------------------------------------------------------------
// mapNetboxType
// ---------------------------------------------------------------------------

describe('mapNetboxType — RJ45 types', () => {
  it('maps 100base-tx to rj45 / 100M', () => {
    const result = mapNetboxType({ type: '100base-tx' })
    expect(result).toEqual({ type: 'rj45', speed: '100M' })
  })

  it('maps 1000base-t to rj45 / 1G', () => {
    const result = mapNetboxType({ type: '1000base-t' })
    expect(result).toEqual({ type: 'rj45', speed: '1G' })
  })

  it('maps 1000base-tx to rj45 / 1G', () => {
    const result = mapNetboxType({ type: '1000base-tx' })
    expect(result).toEqual({ type: 'rj45', speed: '1G' })
  })

  it('maps 2.5gbase-t to rj45 / 2.5G', () => {
    const result = mapNetboxType({ type: '2.5gbase-t' })
    expect(result).toEqual({ type: 'rj45', speed: '2.5G' })
  })

  it('maps 5gbase-t to rj45 / 10G', () => {
    const result = mapNetboxType({ type: '5gbase-t' })
    expect(result).toEqual({ type: 'rj45', speed: '10G' })
  })

  it('maps 10gbase-t to rj45 / 10G', () => {
    const result = mapNetboxType({ type: '10gbase-t' })
    expect(result).toEqual({ type: 'rj45', speed: '10G' })
  })
})

describe('mapNetboxType — SFP types', () => {
  it('maps 1000base-x-sfp to sfp / 1G', () => {
    const result = mapNetboxType({ type: '1000base-x-sfp' })
    expect(result).toEqual({ type: 'sfp', speed: '1G' })
  })

  it('maps 10gbase-x-sfpp to sfp+ / 10G', () => {
    const result = mapNetboxType({ type: '10gbase-x-sfpp' })
    expect(result).toEqual({ type: 'sfp+', speed: '10G' })
  })

  it('maps 25gbase-x-sfp28 to sfp+ / 10G', () => {
    const result = mapNetboxType({ type: '25gbase-x-sfp28' })
    expect(result).toEqual({ type: 'sfp+', speed: '10G' })
  })
})

describe('mapNetboxType — QSFP types', () => {
  it('maps 40gbase-x-qsfpp to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '40gbase-x-qsfpp' })
    expect(result).toEqual({ type: 'qsfp', speed: '100G' })
  })

  it('maps 100gbase-x-qsfp28 to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '100gbase-x-qsfp28' })
    expect(result).toEqual({ type: 'qsfp', speed: '100G' })
  })

  it('maps 100gbase-x-qsfpdd to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '100gbase-x-qsfpdd' })
    expect(result).toEqual({ type: 'qsfp', speed: '100G' })
  })

  it('maps 200gbase-x-qsfp56 to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '200gbase-x-qsfp56' })
    expect(result).toEqual({ type: 'qsfp', speed: '100G' })
  })

  it('maps 400gbase-x-qsfpdd to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '400gbase-x-qsfpdd' })
    expect(result).toEqual({ type: 'qsfp', speed: '100G' })
  })
})

describe('mapNetboxType — management interfaces', () => {
  it('maps mgmt_only + base-t to management / rj45 physical', () => {
    const result = mapNetboxType({ type: '1000base-t', mgmt_only: true })
    expect(result).toEqual({ type: 'management', speed: '1G', physical_type: 'rj45' })
  })

  it('maps mgmt_only + sfp to management / sfp physical', () => {
    const result = mapNetboxType({ type: '1000base-x-sfp', mgmt_only: true })
    expect(result).toEqual({ type: 'management', speed: '1G', physical_type: 'sfp' })
  })

  it('maps mgmt_only + 100base-tx to management / rj45 physical', () => {
    const result = mapNetboxType({ type: '100base-tx', mgmt_only: true })
    expect(result).toEqual({ type: 'management', speed: '1G', physical_type: 'rj45' })
  })
})

describe('mapNetboxType — stacking / virtual types (skip)', () => {
  it('returns null for cisco-stackwise', () => {
    expect(mapNetboxType({ type: 'cisco-stackwise' })).toBe(null)
  })

  it('returns null for cisco-stackwise-plus', () => {
    expect(mapNetboxType({ type: 'cisco-stackwise-plus' })).toBe(null)
  })

  it('returns null for cisco-flexstack', () => {
    expect(mapNetboxType({ type: 'cisco-flexstack' })).toBe(null)
  })

  it('returns null for juniper-vcp', () => {
    expect(mapNetboxType({ type: 'juniper-vcp' })).toBe(null)
  })

  it('returns null for extreme-summitstack', () => {
    expect(mapNetboxType({ type: 'extreme-summitstack' })).toBe(null)
  })

  it('returns null for extreme-summitstack-128', () => {
    expect(mapNetboxType({ type: 'extreme-summitstack-128' })).toBe(null)
  })

  it('returns null for virtual', () => {
    expect(mapNetboxType({ type: 'virtual' })).toBe(null)
  })

  it('returns null for bridge', () => {
    expect(mapNetboxType({ type: 'bridge' })).toBe(null)
  })

  it('returns null for lag', () => {
    expect(mapNetboxType({ type: 'lag' })).toBe(null)
  })
})

describe('mapNetboxType — fallback', () => {
  it('returns rj45 / 1G for unknown type', () => {
    const result = mapNetboxType({ type: 'some-unknown-type' })
    expect(result).toEqual({ type: 'rj45', speed: '1G' })
  })
})

// ---------------------------------------------------------------------------
// mapNetboxPoe
// ---------------------------------------------------------------------------

describe('mapNetboxPoe', () => {
  it('maps type1-ieee802.3af', () => {
    expect(mapNetboxPoe('type1-ieee802.3af')).toEqual({ type: '802.3af', max_watts: 15.4 })
  })

  it('maps type2-ieee802.3at', () => {
    expect(mapNetboxPoe('type2-ieee802.3at')).toEqual({ type: '802.3at', max_watts: 30 })
  })

  it('maps type3-ieee802.3bt', () => {
    expect(mapNetboxPoe('type3-ieee802.3bt')).toEqual({ type: '802.3bt-type3', max_watts: 60 })
  })

  it('maps type4-ieee802.3bt', () => {
    expect(mapNetboxPoe('type4-ieee802.3bt')).toEqual({ type: '802.3bt-type4', max_watts: 100 })
  })

  it('maps passive-24v-2pair', () => {
    expect(mapNetboxPoe('passive-24v-2pair')).toEqual({ type: 'passive-24v', max_watts: 24 })
  })

  it('maps passive-24v-4pair', () => {
    expect(mapNetboxPoe('passive-24v-4pair')).toEqual({ type: 'passive-24v', max_watts: 24 })
  })

  it('maps passive-48v-2pair', () => {
    expect(mapNetboxPoe('passive-48v-2pair')).toEqual({ type: 'passive-48v', max_watts: 48 })
  })

  it('maps passive-48v-4pair', () => {
    expect(mapNetboxPoe('passive-48v-4pair')).toEqual({ type: 'passive-48v', max_watts: 48 })
  })

  it('returns undefined for undefined input', () => {
    expect(mapNetboxPoe(undefined)).toBe(undefined)
  })

  it('returns undefined for unknown value', () => {
    expect(mapNetboxPoe('some-unknown')).toBe(undefined)
  })
})

// ---------------------------------------------------------------------------
// incrementMemberLabel
// ---------------------------------------------------------------------------

describe('incrementMemberLabel', () => {
  it('member 1 returns label unchanged', () => {
    expect(incrementMemberLabel('GigabitEthernet1/0/', 1)).toBe('GigabitEthernet1/0/')
  })

  it('increments first number for member 2 — GigabitEthernet style', () => {
    expect(incrementMemberLabel('GigabitEthernet1/0/', 2)).toBe('GigabitEthernet2/0/')
  })

  it('increments first number for member 3 — GigabitEthernet style', () => {
    expect(incrementMemberLabel('GigabitEthernet1/0/', 3)).toBe('GigabitEthernet3/0/')
  })

  it('increments first number for ge- style', () => {
    expect(incrementMemberLabel('ge-0/0/', 2)).toBe('ge-1/0/')
  })

  it('increments first number for numeric prefix', () => {
    expect(incrementMemberLabel('1/1/', 2)).toBe('2/1/')
  })

  it('prepends memberIndex/ when no digit found', () => {
    expect(incrementMemberLabel('Port', 2)).toBe('2/Port')
  })

  it('prepends memberIndex/ for member 3 when no digit found', () => {
    expect(incrementMemberLabel('Port', 3)).toBe('3/Port')
  })

  it('returns unchanged for member 1 when no digit found', () => {
    expect(incrementMemberLabel('Port', 1)).toBe('Port')
  })
})

// ---------------------------------------------------------------------------
// groupInterfacesToBlocks
// ---------------------------------------------------------------------------

describe('groupInterfacesToBlocks — basic grouping', () => {
  it('groups 24 identical rj45 interfaces into one block', () => {
    const interfaces = Array.from({ length: 24 }, (_, i) => ({
      name: `GigabitEthernet0/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('rj45')
    expect(blocks[0].count).toBe(24)
    expect(blocks[0].start_index).toBe(1)
    expect(blocks[0].rows).toBe(2)
    expect(blocks[0].row_layout).toBe('odd-even')
  })

  it('sets rows=1 and sequential for <24 ports', () => {
    const interfaces = Array.from({ length: 12 }, (_, i) => ({
      name: `GigabitEthernet0/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks[0].rows).toBe(1)
    expect(blocks[0].row_layout).toBe('sequential')
  })

  it('sets rows=2 and odd-even layout for 48 ports', () => {
    const interfaces = Array.from({ length: 48 }, (_, i) => ({
      name: `GigabitEthernet0/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks.length).toBe(1)
    expect(blocks[0].count).toBe(48)
    expect(blocks[0].rows).toBe(2)
    expect(blocks[0].row_layout).toBe('odd-even')
  })

  it('splits rj45 and sfp+ into separate blocks', () => {
    const interfaces = [
      ...Array.from({ length: 24 }, (_, i) => ({
        name: `GigabitEthernet0/${i + 1}`,
        type: '1000base-t',
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `TenGigabitEthernet0/${i + 1}`,
        type: '10gbase-x-sfpp',
      }))
    ]
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks.length).toBe(2)
    const rj45Block = blocks.find(b => b.type === 'rj45')
    const sfpBlock = blocks.find(b => b.type === 'sfp+')
    expect(rj45Block).toBeTruthy()
    expect(sfpBlock).toBeTruthy()
    expect(rj45Block!.count).toBe(24)
    expect(sfpBlock!.count).toBe(4)
  })

  it('filters out stacking interfaces', () => {
    const interfaces = [
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `GigabitEthernet0/${i + 1}`,
        type: '1000base-t',
      })),
      { name: 'Stack1', type: 'cisco-stackwise' },
      { name: 'Stack2', type: 'cisco-stackwise' }
    ]
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks.length).toBe(1)
    expect(blocks[0].count).toBe(8)
  })

  it('creates console block from console-ports array', () => {
    const interfaces: unknown[] = []
    const consolePorts = [{ name: 'Console' }]
    const blocks = groupInterfacesToBlocks(interfaces, consolePorts)
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('console')
    expect(blocks[0].count).toBe(1)
  })

  it('creates management block for mgmt_only interfaces', () => {
    const interfaces = [
      { name: 'Management0/0', type: '1000base-t', mgmt_only: true }
    ]
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('management')
    expect(blocks[0].physical_type).toBe('rj45')
  })

  it('assigns poe config when poe_mode present', () => {
    const interfaces = [
      {
        name: `FastEthernet0/1`,
        type: '1000base-t',
        poe_type: 'type2-ieee802.3at'
      }
    ]
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks[0].poe).toBeTruthy()
    expect(blocks[0].poe!.type).toBe('802.3at')
  })
})

describe('groupInterfacesToBlocks — start_index', () => {
  it('sets start_index from first port number in name', () => {
    const interfaces = Array.from({ length: 8 }, (_, i) => ({
      name: `Ethernet${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks[0].start_index).toBe(1)
  })

  it('sets correct label from name prefix', () => {
    const interfaces = Array.from({ length: 4 }, (_, i) => ({
      name: `GigabitEthernet1/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    expect(blocks[0].label).toBe('GigabitEthernet1/')
  })
})

// ---------------------------------------------------------------------------
// convertNetboxToTemplate
// ---------------------------------------------------------------------------

describe('convertNetboxToTemplate', () => {
  const minimalDevice = {
    manufacturer: 'Cisco',
    model: 'Catalyst 2960',
    interfaces: [
      { name: 'GigabitEthernet0/1', type: '1000base-t' },
      { name: 'GigabitEthernet0/2', type: '1000base-t' }
    ],
    'console-ports': []
  }

  it('sets name as manufacturer + model', () => {
    const { template: tpl } = convertNetboxToTemplate(minimalDevice)
    expect(tpl.name).toBe('Cisco Catalyst 2960')
  })

  it('sets manufacturer and model fields', () => {
    const { template: tpl } = convertNetboxToTemplate(minimalDevice)
    expect(tpl.manufacturer).toBe('Cisco')
    expect(tpl.model).toBe('Catalyst 2960')
  })

  it('produces a single unit with blocks', () => {
    const { template: tpl } = convertNetboxToTemplate(minimalDevice)
    expect(tpl.units.length).toBe(1)
    expect(tpl.units[0].blocks.length > 0).toBeTruthy()
  })

  it('extracts datasheet_url from comments', () => {
    const device = {
      ...minimalDevice,
      comments: 'See datasheet at https://example.com/datasheet.pdf for details.'
    }
    const { template: tpl } = convertNetboxToTemplate(device)
    expect(tpl.datasheet_url).toBe('https://example.com/datasheet.pdf')
  })

  it('leaves datasheet_url undefined when no URL in comments', () => {
    const device = { ...minimalDevice, comments: 'No URL here.' }
    const { template: tpl } = convertNetboxToTemplate(device)
    expect(tpl.datasheet_url).toBe(undefined)
  })

  it('leaves datasheet_url undefined when no comments', () => {
    const { template: tpl } = convertNetboxToTemplate(minimalDevice)
    expect(tpl.datasheet_url).toBe(undefined)
  })

  it('maps valid airflow value', () => {
    const device = { ...minimalDevice, airflow: 'front-to-rear' }
    const { template: tpl } = convertNetboxToTemplate(device)
    expect(tpl.airflow).toBe('front-to-rear')
  })

  it('ignores invalid airflow value', () => {
    const device = { ...minimalDevice, airflow: 'sideways' }
    const { template: tpl } = convertNetboxToTemplate(device)
    expect(tpl.airflow).toBe(undefined)
  })
})
