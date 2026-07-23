import type { Port } from '~~/types/port'

export type BulkCopyPrefill = {
  status: Port['status']
  speed: Port['speed'] | null
  port_mode: Port['port_mode'] | null
  access_vlan: number | null
  native_vlan: number | null
  tagged_vlans: number[]
  poe_selection: string | null
  helper_usage: Port['helper_usage'] | null
  helper_label: string | null
  show_in_helper_list: boolean
}

export function buildCopyPrefill(source: Pick<Port, 'status' | 'speed' | 'port_mode' | 'access_vlan' | 'native_vlan' | 'tagged_vlans' | 'poe' | 'helper_usage' | 'helper_label' | 'show_in_helper_list'>): BulkCopyPrefill {
  return {
    status: source.status,
    speed: source.speed ?? null,
    port_mode: source.port_mode ?? null,
    access_vlan: source.access_vlan ?? null,
    native_vlan: source.native_vlan ?? null,
    helper_usage: source.helper_usage ?? null,
    helper_label: source.helper_label ?? null,
    show_in_helper_list: source.show_in_helper_list ?? true,
    poe_selection: source.poe?.type ?? null,
    tagged_vlans: source.tagged_vlans?.length ? [...source.tagged_vlans] : []
  }
}

export function buildBulkSourceOptions(ports: Pick<Port, 'id' | 'label'>[]): Array<{ label: string, value: string }> {
  return ports.map(port => ({ label: port.label || port.id, value: port.id }))
}

export type BulkFormState = {
  status: string
  speed: string
  port_mode: string
  access_vlan: number | null
  native_vlan: number | null
  tagged_vlans_str: string
  description: string
  helper_usage: string
  helper_label: string
  show_in_helper_list: string
  poe_selection: string
}

export type BulkUpdatePayload = {
  status?: string
  speed?: string
  port_mode?: string
  access_vlan?: number | null
  native_vlan?: number | null
  tagged_vlans?: number[]
  description?: string
  helper_usage?: string | null
  helper_label?: string | null
  show_in_helper_list?: boolean
  poe?: { type: string, max_watts: number } | null
}

type BuildBulkUpdatesInput = {
  form: BulkFormState
  selectedTaggedVlans: number[]
  explicitPrefillFields: Set<string>
  taggedFromInput: number[]
  poeWatts: Record<string, number>
}

export function buildBulkUpdates(input: BuildBulkUpdatesInput): BulkUpdatePayload {
  const { form, selectedTaggedVlans, explicitPrefillFields, taggedFromInput, poeWatts } = input
  const updates: BulkUpdatePayload = {}

  if (form.status) updates.status = form.status
  if (form.speed) updates.speed = form.speed

  if (form.port_mode) {
    updates.port_mode = form.port_mode
    if (form.port_mode === 'access') {
      if (form.access_vlan) updates.access_vlan = form.access_vlan
      updates.native_vlan = null
      updates.tagged_vlans = []
    } else if (form.port_mode === 'trunk') {
      updates.access_vlan = null
      if (form.native_vlan) updates.native_vlan = form.native_vlan
      updates.tagged_vlans = selectedTaggedVlans.length ? [...selectedTaggedVlans] : [...taggedFromInput]
    }
  } else {
    if (form.access_vlan) updates.access_vlan = form.access_vlan
    if (form.native_vlan) updates.native_vlan = form.native_vlan
    if (selectedTaggedVlans.length || taggedFromInput.length) {
      updates.tagged_vlans = selectedTaggedVlans.length ? [...selectedTaggedVlans] : [...taggedFromInput]
    }
  }

  if (explicitPrefillFields.has('access_vlan')) updates.access_vlan = form.access_vlan
  if (explicitPrefillFields.has('native_vlan')) updates.native_vlan = form.native_vlan
  if (explicitPrefillFields.has('tagged_vlans')) updates.tagged_vlans = [...selectedTaggedVlans]

  // ponytail: final mode cleanup wins over stale prefill fields.
  if (form.port_mode === 'access') {
    updates.native_vlan = null
    updates.tagged_vlans = []
  }
  if (form.port_mode === 'trunk') {
    updates.access_vlan = null
  }

  if (form.description) updates.description = form.description

  if (form.helper_usage !== '_no_change') {
    updates.helper_usage = form.helper_usage === '_automatic' ? null : form.helper_usage
  }

  if (form.helper_label) {
    updates.helper_label = form.helper_label
  } else if (explicitPrefillFields.has('helper_label')) {
    updates.helper_label = null
  }

  if (form.show_in_helper_list !== '_no_change') {
    updates.show_in_helper_list = form.show_in_helper_list === 'true'
  }

  if (form.poe_selection === '_clear') {
    updates.poe = null
  } else if (form.poe_selection !== '_no_change') {
    updates.poe = {
      type: form.poe_selection,
      max_watts: poeWatts[form.poe_selection] ?? 0
    }
  } else if (explicitPrefillFields.has('poe')) {
    updates.poe = null
  }

  return updates
}

export function completeLagId(portIds: string[], ports: Port[]): string | undefined {
  const selected = new Set(portIds)
  const lagIds = [...new Set(portIds.map(id => ports.find(port => port.id === id)?.lag_group_id).filter((id): id is string => !!id))]
  if (lagIds.length !== 1) return undefined
  const members = ports.filter(port => port.lag_group_id === lagIds[0]).map(port => port.id)
  return members.length === selected.size && members.every(id => selected.has(id)) ? lagIds[0] : undefined
}
