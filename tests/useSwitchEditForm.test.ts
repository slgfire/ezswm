import { describe, expect, it } from 'vitest'

import { buildSwitchEditSaveBody, computeTemplateWarningRemovedPorts, resolveEffectiveTemplateId } from '../app/composables/useSwitchEditForm'
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
      tags: [],
      notes: null,
      stack_size: 1,
      expected_updated_at: 'ts-1'
    })
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
