import { describe, expect, it } from 'vitest'
import { BUILTIN_DEVICE_TYPES, type CustomDeviceType } from '../types/ipAllocation'
import { deviceTypeFilterOptions, deviceTypeLabel, deviceTypeOptions } from '../app/utils/deviceTypes'

const customs: CustomDeviceType[] = [
  { id: 'custom-active', name: 'Game console', active: true },
  { id: 'custom-inactive', name: 'Legacy appliance', active: false }
]
const translate = (key: string) => `builtin:${key}`

describe('IP allocation device types', () => {
  it('uses translated built-in labels and literal custom names', () => {
    expect(deviceTypeLabel(BUILTIN_DEVICE_TYPES[0], customs, translate)).toBe(`builtin:${BUILTIN_DEVICE_TYPES[0]}`)
    expect(deviceTypeLabel('custom-active', customs, translate)).toBe('Game console')
    expect(deviceTypeLabel('legacy-unknown', customs, translate)).toBe('legacy-unknown')
  })

  it('offers active categories for new assignments and preserves inactive or unknown current values on edit', () => {
    const newOptions = deviceTypeOptions(customs, translate)
    expect(newOptions.map(option => option.value)).toEqual([...BUILTIN_DEVICE_TYPES, 'custom-active'])
    expect(deviceTypeOptions(customs, translate, 'custom-inactive').at(-1)).toEqual({ label: 'Legacy appliance', value: 'custom-inactive' })
    expect(deviceTypeOptions(customs, translate, 'legacy-unknown').at(-1)).toEqual({ label: 'legacy-unknown', value: 'legacy-unknown' })
  })

  it('hides disabled built-ins for new assignments but keeps a disabled current value localized', () => {
    const disabled = ['server', 'switch']
    expect(deviceTypeOptions(customs, translate, undefined, disabled).map(option => option.value)).toEqual([
      ...BUILTIN_DEVICE_TYPES.filter(type => !disabled.includes(type)),
      'custom-active'
    ])
    expect(deviceTypeOptions(customs, translate, 'server', disabled).find(option => option.value === 'server'))
      .toEqual({ label: 'builtin:server', value: 'server' })
    expect(deviceTypeOptions(customs, translate, undefined, []).map(option => option.value)).toContain('server')
  })

  it('keeps inactive and unknown values used by allocations available to filters', () => {
    const options = deviceTypeFilterOptions(customs, ['custom-inactive', 'legacy-unknown'], translate, 'All device types')
    expect(options).toContainEqual({ label: 'Legacy appliance', value: 'custom-inactive' })
    expect(options).toContainEqual({ label: 'legacy-unknown', value: 'legacy-unknown' })
    expect(options.find(option => option.value === 'custom-active')?.label).toBe('Game console')
  })
})
