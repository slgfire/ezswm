import { BUILTIN_DEVICE_TYPES, type CustomDeviceType } from '../../types/ipAllocation'

export interface DeviceTypeOption {
  label: string
  value: string
}

const builtinTypes = new Set<string>(BUILTIN_DEVICE_TYPES)

export function deviceTypeLabel(
  value: string | null | undefined,
  customTypes: readonly CustomDeviceType[],
  translateBuiltin: (key: string) => string,
  emptyLabel = '—'
): string {
  if (!value) return emptyLabel
  if (builtinTypes.has(value)) return translateBuiltin(value)
  return customTypes.find(type => type.id === value)?.name ?? value
}

export function deviceTypeOptions(
  customTypes: readonly CustomDeviceType[],
  translateBuiltin: (key: string) => string,
  currentValue?: string | null,
  disabledBuiltins: readonly string[] = []
): DeviceTypeOption[] {
  const options: DeviceTypeOption[] = BUILTIN_DEVICE_TYPES.filter(value => !disabledBuiltins.includes(value)).map(value => ({
    label: translateBuiltin(value),
    value
  }))

  for (const type of customTypes) {
    if (type.active || type.id === currentValue) options.push({ label: type.name, value: type.id })
  }

  if (currentValue && !options.some(option => option.value === currentValue)) {
    options.push({
      label: builtinTypes.has(currentValue) ? translateBuiltin(currentValue) : currentValue,
      value: currentValue
    })
  }

  return options
}

export function deviceTypeFilterOptions(
  customTypes: readonly CustomDeviceType[],
  usedValues: readonly (string | null | undefined)[],
  translateBuiltin: (key: string) => string,
  allLabel: string
): DeviceTypeOption[] {
  const options: DeviceTypeOption[] = [
    { label: allLabel, value: 'all' },
    ...BUILTIN_DEVICE_TYPES.map(value => ({ label: translateBuiltin(value), value })),
    ...customTypes.map(type => ({ label: type.name, value: type.id }))
  ]

  for (const value of usedValues) {
    if (value && !options.some(option => option.value === value)) options.push({ label: value, value })
  }

  return options
}
