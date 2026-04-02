/**
 * Format an activity entry into a compact human-readable description.
 * Used on both dashboard (without port label prefix) and switch detail page.
 */
export function formatActivitySummary(entry: any): string {
  const { action, entity_type, changes, metadata, previous_state } = entry

  if (action === 'create') {
    if (entity_type === 'lag_group' && metadata?.port_count) return `${metadata.port_count} ports`
    return ''
  }

  if (action === 'delete') return ''
  if (action === 'duplicate') return ''

  if (action === 'update_port') {
    if (!previous_state || !changes) {
      return metadata?.port_label || ''
    }
    return formatPortChange(changes, previous_state, metadata)
  }

  if (action === 'update' && changes && previous_state) {
    return formatEntityChange(changes, previous_state)
  }

  return ''
}

/**
 * formatActivityDetail is no longer used — we show compact one-liners instead.
 * Kept for backwards compatibility but returns empty.
 */
export function formatActivityDetail(_entry: any): { field: string; from: string; to: string }[] {
  return []
}

function formatPortChange(changes: any, prev: any, metadata: any): string {
  const parts: string[] = []
  const port = metadata?.port_label || ''

  // VLAN changes
  const newVlan = changes.native_vlan ?? changes.access_vlan
  const oldVlan = prev?.native_vlan ?? prev?.access_vlan
  if (newVlan !== undefined || oldVlan !== undefined) {
    if (newVlan && !oldVlan) parts.push(`VLAN ${newVlan} zugewiesen`)
    else if (!newVlan && oldVlan) parts.push(`VLAN entfernt`)
    else if (newVlan && oldVlan && newVlan !== oldVlan) parts.push(`VLAN ${oldVlan} → ${newVlan}`)
  }

  // Status changes
  if (changes.status !== undefined && prev?.status !== changes.status) {
    if (changes.status === 'up') parts.push('aktiviert')
    else if (changes.status === 'disabled') parts.push('deaktiviert')
    else if (changes.status === 'down') parts.push('down')
  }

  // Port mode
  if (changes.port_mode !== undefined && prev?.port_mode !== changes.port_mode) {
    if (changes.port_mode === 'trunk') parts.push('Trunk konfiguriert')
    else if (changes.port_mode === 'access') parts.push('Access konfiguriert')
  }

  // Connected device
  if (changes.connected_device !== undefined) {
    if (changes.connected_device && !prev?.connected_device) parts.push(`→ ${changes.connected_device}`)
    else if (!changes.connected_device && prev?.connected_device) parts.push(`${prev.connected_device} getrennt`)
    else if (changes.connected_device && prev?.connected_device && changes.connected_device !== prev.connected_device) {
      parts.push(`→ ${changes.connected_device}`)
    }
  }

  // Speed
  if (changes.speed !== undefined && prev?.speed !== changes.speed) {
    parts.push(`Speed ${prev?.speed || '?'} → ${changes.speed}`)
  }

  // Tagged VLANs
  if (changes.tagged_vlans !== undefined) {
    const oldTags = (prev?.tagged_vlans || []) as number[]
    const newTags = (changes.tagged_vlans || []) as number[]
    const added = newTags.filter(v => !oldTags.includes(v))
    const removed = oldTags.filter(v => !newTags.includes(v))
    if (added.length) parts.push(`+VLAN ${added.join(',')} (tagged)`)
    if (removed.length) parts.push(`-VLAN ${removed.join(',')} (tagged)`)
  }

  if (parts.length === 0) return port
  const prefix = port ? `${port}: ` : ''
  return prefix + parts.slice(0, 3).join(', ')
}

function formatEntityChange(changes: any, prev: any): string {
  const parts: string[] = []

  if (changes.name && prev?.name && changes.name !== prev.name) {
    parts.push(`${prev.name} → ${changes.name}`)
  }
  if (changes.management_ip !== undefined && prev?.management_ip !== changes.management_ip) {
    parts.push(`IP: ${changes.management_ip || 'entfernt'}`)
  }
  if (changes.status !== undefined && prev?.status !== changes.status) {
    parts.push(`Status: ${changes.status}`)
  }

  return parts.slice(0, 2).join(', ')
}
