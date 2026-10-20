import { describe, expect, it } from 'vitest'

import { buildSwitchEditSaveBody, computeTemplateWarningRemovedPorts, resolveEffectiveTemplateId } from '../app/composables/useSwitchEditForm'
import { getSwitchManagementHref, isValidManagementUrlOverride } from '../app/utils/switchManagement'
import type { LayoutTemplate } from '../types/layoutTemplate'

const templates: LayoutTemplate[] = [
  {
    id: 'tpl-a',
    name: 'Template A',
    units: [
      {
        unit_number: 1,
        blocks: [
          { id: 'a-rj45', type: 'rj45', count: 2, start_index: 1, rows: 1 }
        ]
      }
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'tpl-b',
    name: 'Template B',
    units: [
      {
        unit_number: 1,
        blocks: [
          { id: 'b-rj45', type: 'rj45', count: 1, start_index: 1, rows: 1 },
          { id: 'b-sfp', type: 'sfp', count: 1, start_index: 49, rows: 1 }
        ]
      }
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  }
]

describe('useSwitchEditForm destructive warning calculation', () => {
  it('sends model clear as null in update payload', () => {
    expect(buildSwitchEditSaveBody({
      name: 'SW-1',
      model: '',
      manufacturer: 'Vendor',
      serial_number: '',
      location: '',
      rack_position: '',
      management_ip: '',
      firmware_version: '',
      layout_template_id: '',
      group_id: '_ungrouped',
      role: '',
      tags: [],
      notes: '',
      stack_size: 1
    }, 'ts-1')).toEqual({
      name: 'SW-1',
      model: null,
      manufacturer: 'Vendor',
      serial_number: null,
      location: null,
      rack_position: null,
      management_ip: null,
      firmware_version: null,
      group_id: null,
      tags: [],
      notes: null,
      stack_size: 1,
      expected_updated_at: 'ts-1'
    })
  })

  it('clears a blank management URL explicitly while preserving protocol', () => {
    expect(buildSwitchEditSaveBody({
      name: 'SW-1',
      management_ip: '192.0.2.10',
      management_protocol: 'http',
      management_url: '',
      layout_template_id: '',
      tags: [],
      stack_size: 1
    })).toMatchObject({
      management_ip: '192.0.2.10',
      management_protocol: 'http',
      management_url: null
    })
  })

  it('omits group_id when the switch-groups feature is disabled', () => {
    const body = buildSwitchEditSaveBody({
      name: 'SW-1',
      layout_template_id: '',
      group_id: 'grp-1',
      role: '',
      tags: [],
      stack_size: 1
    }, undefined, { groupsEnabled: false })
    expect(body).not.toHaveProperty('group_id')
    expect(body.name).toBe('SW-1')
  })

  it('keeps group_id conversion when the switch-groups feature is enabled', () => {
    const body = buildSwitchEditSaveBody({
      name: 'SW-1',
      layout_template_id: '',
      group_id: '_ungrouped',
      role: '',
      tags: [],
      stack_size: 1
    }, undefined, { groupsEnabled: true })
    expect(body.group_id).toBeNull()
  })

  it('uses current template when requested template is blank', () => {
    expect(resolveEffectiveTemplateId('tpl-a', '')).toBe('tpl-a')
  })

  it('does not require confirmation for non-destructive template change', () => {
    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: 'tpl-b',
      currentStackSize: 1,
      nextStackSize: 1,
      templates,
      currentPorts: [
        { id: 'p1', unit: 1, index: 1, type: 'rj45', label: '1/1' }
      ]
    })).toEqual({ removed: [], removesAll: false })
  })

  it('template-only change removes only unmatched ports', () => {
    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: 'tpl-b',
      currentStackSize: 1,
      nextStackSize: 1,
      templates,
      currentPorts: [
        { id: 'keep', unit: 1, index: 1, type: 'rj45', label: '1/1' },
        { id: 'drop', unit: 1, index: 2, type: 'rj45', label: '1/2' }
      ]
    })).toEqual({
      removed: [{ id: 'drop', label: '1/2' }],
      removesAll: false
    })
  })

  it('stack-size change marks all current ports as removed', () => {
    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: 'tpl-a',
      currentStackSize: 1,
      nextStackSize: 2,
      templates,
      currentPorts: [
        { id: 'p1', unit: 1, index: 1, type: 'rj45', label: 'A' },
        { id: 'p2', unit: 1, index: 2, type: 'rj45' }
      ]
    })).toEqual({
      removed: [{ id: 'p1', label: 'A' }, { id: 'p2', label: '1/2' }],
      removesAll: true
    })
  })

  it('warns on stack change even when template selection is cleared', () => {
    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: '',
      currentStackSize: 1,
      nextStackSize: 2,
      templates,
      currentPorts: [
        { id: 'p1', unit: 1, index: 1, type: 'rj45', label: '1/1' },
        { id: 'p2', unit: 1, index: 2, type: 'rj45', label: '1/2' }
      ]
    })).toEqual({
      removed: [{ id: 'p1', label: '1/1' }, { id: 'p2', label: '1/2' }],
      removesAll: true
    })
  })

  it('clearing or no effective change has no confirmation warning', () => {
    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: '',
      currentStackSize: 1,
      nextStackSize: 1,
      templates,
      currentPorts: [
        { id: 'p1', unit: 1, index: 1, type: 'rj45', label: '1/1' }
      ]
    })).toEqual({ removed: [], removesAll: false })

    expect(computeTemplateWarningRemovedPorts({
      currentTemplateId: 'tpl-a',
      nextTemplateId: 'tpl-a',
      currentStackSize: 1,
      nextStackSize: 1,
      templates,
      currentPorts: [
        { id: 'p1', unit: 1, index: 1, type: 'rj45', label: '1/1' }
      ]
    })).toEqual({ removed: [], removesAll: false })
  })

})

describe('switch management links', () => {
  it('uses the override before protocol and management IP', () => {
    expect(getSwitchManagementHref({
      management_ip: '192.0.2.10',
      management_protocol: 'http',
      management_url: 'https://switch.example:8443/ui'
    })).toBe('https://switch.example:8443/ui')
  })

  it('defaults an existing management IP to HTTPS and supports HTTP', () => {
    expect(getSwitchManagementHref({ management_ip: '192.0.2.10' })).toBe('https://192.0.2.10/')
    expect(getSwitchManagementHref({ management_ip: '192.0.2.10', management_protocol: 'http' })).toBe('http://192.0.2.10/')
  })

  it('uses a valid bracketed IPv6 management address', () => {
    expect(getSwitchManagementHref({ management_ip: '[2001:db8::10]', management_protocol: 'http' })).toBe('http://[2001:db8::10]/')
  })

  it('returns no link without a usable address or override', () => {
    expect(getSwitchManagementHref({})).toBeNull()
    expect(getSwitchManagementHref({ management_ip: '999.2.3.4' })).toBeNull()
  })

  it('falls back to the management IP when the override is explicitly cleared', () => {
    expect(getSwitchManagementHref({ management_ip: '192.0.2.10', management_url: null })).toBe('https://192.0.2.10/')
  })

  it.each([
    'javascript:alert(1)',
    'ftp://switch.example',
    'https://user:password@switch.example',
    'https://switch example/',
    'https://switch.example/' + 'x'.repeat(2048)
  ])('rejects unsafe or invalid override %s', (management_url) => {
    expect(isValidManagementUrlOverride(management_url)).toBe(false)
    expect(getSwitchManagementHref({ management_ip: '192.0.2.10', management_url })).toBeNull()
  })
})
