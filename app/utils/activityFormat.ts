import type { ActivityEntry } from '~~/types/activity'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

/**
 * Format an activity entry into a compact human-readable description.
 * @param detailed - if true, show all changes (switch detail page). If false, max 2-3 (dashboard).
 */
export function formatActivitySummary(entry: ActivityEntry, t: TranslateFn, detailed: boolean = false): string {
  const { action, entity_type, changes, metadata, previous_state } = entry

  if (action === 'create') {
    if (entity_type === 'lag_group' && metadata?.port_count) return `${metadata.port_count} ports`
    return ''
  }

  if (action === 'delete') return ''
  if (action === 'duplicate') return ''

  if (action === 'update_port') {
    if (!previous_state || !changes) {
      return (metadata?.port_label as string) || ''
    }
    return formatPortChange(changes, previous_state, metadata, t, detailed)
  }

  if (action === 'update' && changes && previous_state) {
    return formatEntityChange(changes, previous_state, t)
  }

  return ''
}

/**
 * No longer used — kept for backwards compatibility.
 */
export function formatActivityDetail(_entry: ActivityEntry): { field: string; from: string; to: string }[] {
  return []
}

function formatPortChange(changes: Record<string, unknown>, prev: Record<string, unknown>, metadata: Record<string, unknown> | undefined, t: TranslateFn, detailed: boolean = false): string {
  const parts: string[] = []
  const port = (metadata?.port_label as string) || ''

  // VLAN changes
  const newVlan = (changes.native_vlan ?? changes.access_vlan) as number | undefined
  const oldVlan = (prev?.native_vlan ?? prev?.access_vlan) as number | undefined
  if (newVlan !== undefined || oldVlan !== undefined) {
    if (newVlan && !oldVlan) parts.push(t('activity.vlanAssigned', { vlan: newVlan }))
    else if (!newVlan && oldVlan) parts.push(t('activity.vlanRemoved'))
    else if (newVlan && oldVlan && newVlan !== oldVlan) parts.push(`VLAN ${oldVlan} → ${newVlan}`)
  }

  // Status changes
  if (changes.status !== undefined && prev?.status !== changes.status) {
    if (changes.status === 'up') parts.push(t('activity.activated'))
    else if (changes.status === 'disabled') parts.push(t('activity.disabled'))
    else if (changes.status === 'down') parts.push('down')
  }

  // Port mode
  if (changes.port_mode !== undefined && prev?.port_mode !== changes.port_mode) {
    if (changes.port_mode === 'trunk') parts.push(t('activity.trunkConfigured'))
    else if (changes.port_mode === 'access') parts.push(t('activity.accessConfigured'))
  }

  // Connected device
  if (changes.connected_device !== undefined) {
    if (changes.connected_device && !prev?.connected_device) parts.push(`→ ${changes.connected_device}`)
    else if (!changes.connected_device && prev?.connected_device) parts.push(t('activity.disconnected', { device: prev.connected_device as string }))
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
  return prefix + (detailed ? parts : parts.slice(0, 3)).join(', ')
}

function formatEntityChange(changes: Record<string, unknown>, prev: Record<string, unknown>, t: TranslateFn): string {
  const parts: string[] = []

  if (changes.name && prev?.name && changes.name !== prev.name) {
    parts.push(`${prev.name} → ${changes.name}`)
  }
  if (changes.management_ip !== undefined && prev?.management_ip !== changes.management_ip) {
    parts.push(`IP: ${changes.management_ip || t('activity.removed')}`)
  }
  if (changes.status !== undefined && prev?.status !== changes.status) {
    parts.push(`Status: ${changes.status}`)
  }

  return parts.slice(0, 2).join(', ')
}
