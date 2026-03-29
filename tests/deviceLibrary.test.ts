import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
    assert.deepEqual(result, { type: 'rj45', speed: '100M' })
  })

  it('maps 1000base-t to rj45 / 1G', () => {
    const result = mapNetboxType({ type: '1000base-t' })
    assert.deepEqual(result, { type: 'rj45', speed: '1G' })
  })

  it('maps 1000base-tx to rj45 / 1G', () => {
    const result = mapNetboxType({ type: '1000base-tx' })
    assert.deepEqual(result, { type: 'rj45', speed: '1G' })
  })

  it('maps 2.5gbase-t to rj45 / 2.5G', () => {
    const result = mapNetboxType({ type: '2.5gbase-t' })
    assert.deepEqual(result, { type: 'rj45', speed: '2.5G' })
  })

  it('maps 5gbase-t to rj45 / 10G', () => {
    const result = mapNetboxType({ type: '5gbase-t' })
    assert.deepEqual(result, { type: 'rj45', speed: '10G' })
  })

  it('maps 10gbase-t to rj45 / 10G', () => {
    const result = mapNetboxType({ type: '10gbase-t' })
    assert.deepEqual(result, { type: 'rj45', speed: '10G' })
  })
})

describe('mapNetboxType — SFP types', () => {
  it('maps 1000base-x-sfp to sfp / 1G', () => {
    const result = mapNetboxType({ type: '1000base-x-sfp' })
    assert.deepEqual(result, { type: 'sfp', speed: '1G' })
  })

  it('maps 10gbase-x-sfpp to sfp+ / 10G', () => {
    const result = mapNetboxType({ type: '10gbase-x-sfpp' })
    assert.deepEqual(result, { type: 'sfp+', speed: '10G' })
  })

  it('maps 25gbase-x-sfp28 to sfp+ / 10G', () => {
    const result = mapNetboxType({ type: '25gbase-x-sfp28' })
    assert.deepEqual(result, { type: 'sfp+', speed: '10G' })
  })
})

describe('mapNetboxType — QSFP types', () => {
  it('maps 40gbase-x-qsfpp to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '40gbase-x-qsfpp' })
    assert.deepEqual(result, { type: 'qsfp', speed: '100G' })
  })

  it('maps 100gbase-x-qsfp28 to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '100gbase-x-qsfp28' })
    assert.deepEqual(result, { type: 'qsfp', speed: '100G' })
  })

  it('maps 100gbase-x-qsfpdd to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '100gbase-x-qsfpdd' })
    assert.deepEqual(result, { type: 'qsfp', speed: '100G' })
  })

  it('maps 200gbase-x-qsfp56 to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '200gbase-x-qsfp56' })
    assert.deepEqual(result, { type: 'qsfp', speed: '100G' })
  })

  it('maps 400gbase-x-qsfpdd to qsfp / 100G', () => {
    const result = mapNetboxType({ type: '400gbase-x-qsfpdd' })
    assert.deepEqual(result, { type: 'qsfp', speed: '100G' })
  })
})

describe('mapNetboxType — management interfaces', () => {
  it('maps mgmt_only + base-t to management / rj45 physical', () => {
    const result = mapNetboxType({ type: '1000base-t', mgmt_only: true })
    assert.deepEqual(result, { type: 'management', speed: '1G', physical_type: 'rj45' })
  })

  it('maps mgmt_only + sfp to management / sfp physical', () => {
    const result = mapNetboxType({ type: '1000base-x-sfp', mgmt_only: true })
    assert.deepEqual(result, { type: 'management', speed: '1G', physical_type: 'sfp' })
  })

  it('maps mgmt_only + 100base-tx to management / rj45 physical', () => {
    const result = mapNetboxType({ type: '100base-tx', mgmt_only: true })
    assert.deepEqual(result, { type: 'management', speed: '1G', physical_type: 'rj45' })
  })
})

describe('mapNetboxType — stacking / virtual types (skip)', () => {
  it('returns null for cisco-stackwise', () => {
    assert.equal(mapNetboxType({ type: 'cisco-stackwise' }), null)
  })

  it('returns null for cisco-stackwise-plus', () => {
    assert.equal(mapNetboxType({ type: 'cisco-stackwise-plus' }), null)
  })

  it('returns null for cisco-flexstack', () => {
    assert.equal(mapNetboxType({ type: 'cisco-flexstack' }), null)
  })

  it('returns null for juniper-vcp', () => {
    assert.equal(mapNetboxType({ type: 'juniper-vcp' }), null)
  })

  it('returns null for extreme-summitstack', () => {
    assert.equal(mapNetboxType({ type: 'extreme-summitstack' }), null)
  })

  it('returns null for extreme-summitstack-128', () => {
    assert.equal(mapNetboxType({ type: 'extreme-summitstack-128' }), null)
  })

  it('returns null for virtual', () => {
    assert.equal(mapNetboxType({ type: 'virtual' }), null)
  })

  it('returns null for bridge', () => {
    assert.equal(mapNetboxType({ type: 'bridge' }), null)
  })

  it('returns null for lag', () => {
    assert.equal(mapNetboxType({ type: 'lag' }), null)
  })
})

describe('mapNetboxType — fallback', () => {
  it('returns rj45 / 1G for unknown type', () => {
    const result = mapNetboxType({ type: 'some-unknown-type' })
    assert.deepEqual(result, { type: 'rj45', speed: '1G' })
  })
})

// ---------------------------------------------------------------------------
// mapNetboxPoe
// ---------------------------------------------------------------------------

describe('mapNetboxPoe', () => {
  it('maps type1-ieee802.3af', () => {
    assert.deepEqual(mapNetboxPoe('type1-ieee802.3af'), { type: '802.3af', max_watts: 15.4 })
  })

  it('maps type2-ieee802.3at', () => {
    assert.deepEqual(mapNetboxPoe('type2-ieee802.3at'), { type: '802.3at', max_watts: 30 })
  })

  it('maps type3-ieee802.3bt', () => {
    assert.deepEqual(mapNetboxPoe('type3-ieee802.3bt'), { type: '802.3bt-type3', max_watts: 60 })
  })

  it('maps type4-ieee802.3bt', () => {
    assert.deepEqual(mapNetboxPoe('type4-ieee802.3bt'), { type: '802.3bt-type4', max_watts: 100 })
  })

  it('maps passive-24v-2pair', () => {
    assert.deepEqual(mapNetboxPoe('passive-24v-2pair'), { type: 'passive-24v', max_watts: 24 })
  })

  it('maps passive-24v-4pair', () => {
    assert.deepEqual(mapNetboxPoe('passive-24v-4pair'), { type: 'passive-24v', max_watts: 24 })
  })

  it('maps passive-48v-2pair', () => {
    assert.deepEqual(mapNetboxPoe('passive-48v-2pair'), { type: 'passive-48v', max_watts: 48 })
  })

  it('maps passive-48v-4pair', () => {
    assert.deepEqual(mapNetboxPoe('passive-48v-4pair'), { type: 'passive-48v', max_watts: 48 })
  })

  it('returns undefined for undefined input', () => {
    assert.equal(mapNetboxPoe(undefined), undefined)
  })

  it('returns undefined for unknown value', () => {
    assert.equal(mapNetboxPoe('some-unknown'), undefined)
  })
})

// ---------------------------------------------------------------------------
// incrementMemberLabel
// ---------------------------------------------------------------------------

describe('incrementMemberLabel', () => {
  it('member 1 returns label unchanged', () => {
    assert.equal(incrementMemberLabel('GigabitEthernet1/0/', 1), 'GigabitEthernet1/0/')
  })

  it('increments first number for member 2 — GigabitEthernet style', () => {
    assert.equal(incrementMemberLabel('GigabitEthernet1/0/', 2), 'GigabitEthernet2/0/')
  })

  it('increments first number for member 3 — GigabitEthernet style', () => {
    assert.equal(incrementMemberLabel('GigabitEthernet1/0/', 3), 'GigabitEthernet3/0/')
  })

  it('increments first number for ge- style', () => {
    assert.equal(incrementMemberLabel('ge-0/0/', 2), 'ge-1/0/')
  })

  it('increments first number for numeric prefix', () => {
    assert.equal(incrementMemberLabel('1/1/', 2), '2/1/')
  })

  it('prepends memberIndex/ when no digit found', () => {
    assert.equal(incrementMemberLabel('Port', 2), '2/Port')
  })

  it('prepends memberIndex/ for member 3 when no digit found', () => {
    assert.equal(incrementMemberLabel('Port', 3), '3/Port')
  })

  it('returns unchanged for member 1 when no digit found', () => {
    assert.equal(incrementMemberLabel('Port', 1), 'Port')
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
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'rj45')
    assert.equal(blocks[0].count, 24)
    assert.equal(blocks[0].start_index, 1)
    assert.equal(blocks[0].rows, 2)
    assert.equal(blocks[0].row_layout, 'odd-even')
  })

  it('sets rows=1 and sequential for <24 ports', () => {
    const interfaces = Array.from({ length: 12 }, (_, i) => ({
      name: `GigabitEthernet0/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    assert.equal(blocks[0].rows, 1)
    assert.equal(blocks[0].row_layout, 'sequential')
  })

  it('sets rows=2 and odd-even layout for 48 ports', () => {
    const interfaces = Array.from({ length: 48 }, (_, i) => ({
      name: `GigabitEthernet0/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].count, 48)
    assert.equal(blocks[0].rows, 2)
    assert.equal(blocks[0].row_layout, 'odd-even')
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
    assert.equal(blocks.length, 2)
    const rj45Block = blocks.find(b => b.type === 'rj45')
    const sfpBlock = blocks.find(b => b.type === 'sfp+')
    assert.ok(rj45Block)
    assert.ok(sfpBlock)
    assert.equal(rj45Block!.count, 24)
    assert.equal(sfpBlock!.count, 4)
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
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].count, 8)
  })

  it('creates console block from console-ports array', () => {
    const interfaces: unknown[] = []
    const consolePorts = [{ name: 'Console' }]
    const blocks = groupInterfacesToBlocks(interfaces, consolePorts)
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'console')
    assert.equal(blocks[0].count, 1)
  })

  it('creates management block for mgmt_only interfaces', () => {
    const interfaces = [
      { name: 'Management0/0', type: '1000base-t', mgmt_only: true }
    ]
    const blocks = groupInterfacesToBlocks(interfaces, [])
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'management')
    assert.equal(blocks[0].physical_type, 'rj45')
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
    assert.ok(blocks[0].poe)
    assert.equal(blocks[0].poe!.type, '802.3at')
  })
})

describe('groupInterfacesToBlocks — start_index', () => {
  it('sets start_index from first port number in name', () => {
    const interfaces = Array.from({ length: 8 }, (_, i) => ({
      name: `Ethernet${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    assert.equal(blocks[0].start_index, 1)
  })

  it('sets correct label from name prefix', () => {
    const interfaces = Array.from({ length: 4 }, (_, i) => ({
      name: `GigabitEthernet1/${i + 1}`,
      type: '1000base-t',
    }))
    const blocks = groupInterfacesToBlocks(interfaces, [])
    assert.equal(blocks[0].label, 'GigabitEthernet1/')
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
    const tpl = convertNetboxToTemplate(minimalDevice)
    assert.equal(tpl.name, 'Cisco Catalyst 2960')
  })

  it('sets manufacturer and model fields', () => {
    const tpl = convertNetboxToTemplate(minimalDevice)
    assert.equal(tpl.manufacturer, 'Cisco')
    assert.equal(tpl.model, 'Catalyst 2960')
  })

  it('produces a single unit with blocks', () => {
    const tpl = convertNetboxToTemplate(minimalDevice)
    assert.equal(tpl.units.length, 1)
    assert.ok(tpl.units[0].blocks.length > 0)
  })

  it('extracts datasheet_url from comments', () => {
    const device = {
      ...minimalDevice,
      comments: 'See datasheet at https://example.com/datasheet.pdf for details.'
    }
    const tpl = convertNetboxToTemplate(device)
    assert.equal(tpl.datasheet_url, 'https://example.com/datasheet.pdf')
  })

  it('leaves datasheet_url undefined when no URL in comments', () => {
    const device = { ...minimalDevice, comments: 'No URL here.' }
    const tpl = convertNetboxToTemplate(device)
    assert.equal(tpl.datasheet_url, undefined)
  })

  it('leaves datasheet_url undefined when no comments', () => {
    const tpl = convertNetboxToTemplate(minimalDevice)
    assert.equal(tpl.datasheet_url, undefined)
  })

  it('maps valid airflow value', () => {
    const device = { ...minimalDevice, airflow: 'front-to-rear' }
    const tpl = convertNetboxToTemplate(device)
    assert.equal(tpl.airflow, 'front-to-rear')
  })

  it('ignores invalid airflow value', () => {
    const device = { ...minimalDevice, airflow: 'sideways' }
    const tpl = convertNetboxToTemplate(device)
    assert.equal(tpl.airflow, undefined)
  })
})
