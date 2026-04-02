/**
 * Format an activity entry into a human-readable short summary (for dashboard).
 */
export function formatActivitySummary(entry: any): string {
  const { action, entity_type, changes, metadata, previous_state } = entry

  if (action === 'create') {
    return formatCreateSummary(entity_type, entry)
  }

  if (action === 'delete') {
    return ''  // delete is self-explanatory from the action icon
  }

  if (action === 'update_port') {
    // New format has metadata.port_label + changes/previous_state diff
    if (metadata?.port_label && previous_state) {
      return formatPortChangeSummary(changes || {}, previous_state, metadata)
    }
    // Old format: changes contains all port fields, no previous_state — just show port label
    if (metadata?.port_label) return metadata.port_label
    if (changes?.port_id) return ''
    return ''
  }

  if (action === 'update' && changes) {
    return formatUpdateSummary(entity_type, changes, previous_state)
  }

  if (action === 'duplicate') {
    return ''
  }

  return ''
}

/**
 * Format an activity entry into a detailed diff (for entity detail pages).
 */
export function formatActivityDetail(entry: any): { field: string; from: string; to: string }[] {
  const { changes, previous_state, action } = entry
  const diffs: { field: string; from: string; to: string }[] = []

  // Only show diffs when we have both changes AND previous_state (new format)
  if (!changes || !previous_state || action === 'create' || action === 'delete') return diffs

  for (const key of Object.keys(changes)) {
    if (key === 'port_id' || key === 'updated_at') continue
    const from = previous_state[key]
    const to = changes[key]
    // Skip if values are the same
    if (JSON.stringify(from) === JSON.stringify(to)) continue
    diffs.push({
      field: formatFieldName(key),
      from: formatValue(from),
      to: formatValue(to),
    })
  }

  return diffs
}

function formatCreateSummary(entityType: string, entry: any): string {
  if (entityType === 'lag_group' && entry.metadata?.port_count) {
    return `${entry.metadata.port_count} ports`
  }
  return ''
}

function formatPortChangeSummary(changes: any, prev: any, metadata: any): string {
  const parts: string[] = []
  const portLabel = metadata?.port_label || ''

  // Only show the most important change, skip trivial ones
  if (changes.native_vlan !== undefined && (prev?.native_vlan || changes.native_vlan)) {
    parts.push(`VLAN ${prev?.native_vlan || '—'} → ${changes.native_vlan || '—'}`)
  } else if (changes.access_vlan !== undefined && (prev?.access_vlan || changes.access_vlan)) {
    parts.push(`VLAN ${prev?.access_vlan || '—'} → ${changes.access_vlan || '—'}`)
  }
  if (changes.status !== undefined && prev?.status && prev.status !== changes.status) {
    parts.push(`${prev.status} → ${changes.status}`)
  }
  if (changes.connected_device !== undefined && changes.connected_device) {
    parts.push(`→ ${changes.connected_device}`)
  } else if (changes.connected_device === null && prev?.connected_device) {
    parts.push(`${prev.connected_device} disconnected`)
  }

  if (parts.length === 0) return portLabel ? portLabel : ''
  const prefix = portLabel ? `${portLabel}: ` : ''
  return prefix + parts.slice(0, 2).join(', ')
}

function formatUpdateSummary(_entityType: string, changes: any, prev: any): string {
  const parts: string[] = []

  if (changes.name && prev?.name && changes.name !== prev.name) {
    parts.push(`${prev.name} → ${changes.name}`)
  } else if (changes.management_ip !== undefined && prev?.management_ip !== changes.management_ip) {
    parts.push(`IP: ${changes.management_ip || '—'}`)
  } else if (changes.status !== undefined && prev?.status !== changes.status) {
    parts.push(`${changes.status}`)
  }

  return parts.slice(0, 1).join('')
}

function formatFieldName(key: string): string {
  const map: Record<string, string> = {
    native_vlan: 'Native VLAN',
    access_vlan: 'Access VLAN',
    tagged_vlans: 'Tagged VLANs',
    port_mode: 'Port Mode',
    connected_device: 'Connected Device',
    connected_port: 'Connected Port',
    connected_device_id: 'Connected Device ID',
    connected_port_id: 'Connected Port ID',
    management_ip: 'Management IP',
    firmware_version: 'Firmware',
    layout_template_id: 'Template',
    rack_position: 'Rack Position',
    serial_number: 'Serial Number',
    stack_size: 'Stack Size',
    remote_device: 'Remote Device',
    remote_device_id: 'Remote Device ID',
    poe: 'PoE',
  }
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (Array.isArray(val)) {
    return val.length === 0 ? '—' : val.join(', ')
  }
  if (typeof val === 'object') {
    // PoE object etc.
    const obj = val as Record<string, unknown>
    if (obj.type) return String(obj.type)
    return JSON.stringify(val)
  }
  return String(val)
}
