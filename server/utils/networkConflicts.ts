import { canonicalizeCIDR, isValidCIDR } from './ipv4'

const MAX_REPORTED = 5

type Row = Record<string, unknown>

function describe(r: Row): string {
  const name = typeof r.name === 'string' ? ` "${r.name.slice(0, 80)}"` : ''
  return `${String(r.id)}${name}`
}

function report(kind: string, found: string[]): string | null {
  if (found.length === 0) return null
  const shown = found.slice(0, MAX_REPORTED).join('; ')
  const more = found.length > MAX_REPORTED ? ` (+${found.length - MAX_REPORTED} more)` : ''
  return `${kind}: ${shown}${more}`
}

/**
 * Networks must be unique per (site, VLAN-or-untagged scope, canonical CIDR).
 * Mirrors the NETWORK_SUBNET_CONFLICT DB trigger. Rows with an invalid subnet are ignored.
 * Returns a bounded error message, or null when no conflict exists.
 */
export function findNetworkConflict(rows: Row[]): string | null {
  const seen = new Map<string, Row>()
  const found: string[] = []
  for (const r of rows) {
    if (typeof r.subnet !== 'string' || !isValidCIDR(r.subnet)) continue
    const key = [r.site_id ?? '', r.vlan_id ?? '', canonicalizeCIDR(r.subnet)].join('\u0000')
    const prev = seen.get(key)
    if (prev) found.push(`${describe(r)} duplicates ${describe(prev)} (${canonicalizeCIDR(r.subnet)})`)
    else seen.set(key, r)
  }
  return report('Duplicate network CIDR within the same site and VLAN scope', found)
}

/** Allocations must be unique per (network, ip_address). Mirrors the IP_ALLOCATION_CONFLICT trigger. */
export function findAllocationConflict(rows: Row[]): string | null {
  const seen = new Map<string, Row>()
  const found: string[] = []
  for (const r of rows) {
    const key = `${String(r.network_id)}\u0000${String(r.ip_address)}`
    const prev = seen.get(key)
    if (prev) found.push(`${String(r.id)} duplicates ${String(prev.id)} (${String(r.ip_address).slice(0, 64)})`)
    else seen.set(key, r)
  }
  return report('Duplicate IP address within the same network', found)
}
