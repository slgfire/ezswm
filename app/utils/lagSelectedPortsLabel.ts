export function selectedPortsLabel(count: number, translate: (key: string, params: { count: number }) => string): string {
  return translate('lag.selectedPorts', { count })
}

export function selectedPortsTrigger(portIds: readonly string[], translate: (key: string, params: { count: number }) => string, defaultSlot: (children: string) => string): string {
  if (portIds.length === 0) return ''
  return defaultSlot(selectedPortsLabel(portIds.length, translate))
}
