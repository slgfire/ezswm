import { readJson, writeJson } from '../storage/jsonStorage'
import type { Switch } from '../../types/switch'

function normalizeConfiguredVlans(vlans: number[]): number[] {
  return [...new Set(vlans)]
    .filter(v => Number.isInteger(v) && v >= 1 && v <= 4094)
    .sort((a, b) => a - b)
}

function computeConfiguredVlansFromPorts(sw: Switch): number[] {
  const vlanIds: number[] = []
  for (const port of sw.ports) {
    if (port.access_vlan) vlanIds.push(port.access_vlan)
    if (port.native_vlan) vlanIds.push(port.native_vlan)
    if (port.tagged_vlans) vlanIds.push(...port.tagged_vlans)
  }
  return normalizeConfiguredVlans(vlanIds)
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

export default defineNitroPlugin(() => {
  console.log('[migration] Checking configured_vlans migration...')

  const switches = readJson<Switch[]>('switches.json')
  if (switches.length === 0) {
    console.log('[migration] No switches found — nothing to do')
    return
  }

  let migrated = 0
  let normalized = 0
  let changed = false

  for (const sw of switches) {
    if (!Array.isArray(sw.configured_vlans)) {
      sw.configured_vlans = computeConfiguredVlansFromPorts(sw)
      console.log(`[migration] Switch "${sw.name}" (id: ${sw.id}): computed configured_vlans from ports → [${sw.configured_vlans.join(', ')}]`)
      migrated++
      changed = true
    } else {
      const normalizedArr = normalizeConfiguredVlans(sw.configured_vlans)
      if (!arraysEqual(sw.configured_vlans, normalizedArr)) {
        console.log(`[migration] Switch "${sw.name}" (id: ${sw.id}): normalized existing configured_vlans [${sw.configured_vlans.join(', ')}] → [${normalizedArr.join(', ')}]`)
        sw.configured_vlans = normalizedArr
        normalized++
        changed = true
      }
    }
  }

  if (changed) {
    writeJson('switches.json', switches)
    console.log(`[migration] Migrated ${migrated} switches, normalized ${normalized} switches`)
  } else {
    console.log('[migration] All switches already have valid configured_vlans — nothing to do')
  }
})
