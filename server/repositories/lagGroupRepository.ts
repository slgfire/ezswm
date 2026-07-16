import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { LAGGroup } from '../../types/lagGroup'

interface LagRow {
  id: string
  switch_id: string
  name: string
  remote_device: string | null
  remote_device_id: string | null
  description: string | null
  created_at: string
  updated_at: string
}

async function rowToLag(row: LagRow): Promise<LAGGroup> {
  const portRows = await prisma.port.findMany({
    where: { lag_group_id: row.id },
    select: { id: true },
    orderBy: [{ unit: 'asc' }, { index: 'asc' }]
  })
  return {
    id: row.id,
    switch_id: row.switch_id,
    name: row.name,
    port_ids: portRows.map(p => p.id),
    remote_device: row.remote_device ?? undefined,
    remote_device_id: row.remote_device_id ?? undefined,
    description: row.description ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

async function rowsToLags(rows: LagRow[]): Promise<LAGGroup[]> {
  return Promise.all(rows.map(rowToLag))
}

export const lagGroupRepository = {
  async list(switchId?: string): Promise<LAGGroup[]> {
    const rows = await prisma.lagGroup.findMany({
      where: switchId ? { switch_id: switchId } : undefined,
      orderBy: [{ switch_id: 'asc' }, { name: 'asc' }]
    })
    return rowsToLags(rows)
  },

  async getById(id: string): Promise<LAGGroup | null> {
    const row = await prisma.lagGroup.findUnique({ where: { id } })
    return row ? rowToLag(row) : null
  },

  async create(idOrSlug: string, data: Omit<LAGGroup, 'id' | 'switch_id' | 'created_at' | 'updated_at'>): Promise<LAGGroup> {
    // Accept either a UUID or a globally-unique slug (the detail page passes the
    // route slug). Resolve to the real PK before any `where: { id }` use.
    let sw = await prisma.switch.findUnique({
      where: { id: idOrSlug },
      include: { ports: { select: { id: true, lag_group_id: true } } }
    })
    if (!sw) {
      const matches = await prisma.switch.findMany({
        where: { slug: idOrSlug },
        include: { ports: { select: { id: true, lag_group_id: true } } }
      })
      if (matches.length === 1) sw = matches[0]!
    }
    if (!sw) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }
    const switchId = sw.id

    if (data.port_ids.length < 2 || new Set(data.port_ids).size !== data.port_ids.length) throw createError({ statusCode: 400, message: 'A LAG group requires at least two distinct ports' })

    const now = new Date().toISOString()
    const newId = randomUUID()
    const normalizedName = data.name.trim()

    const sync = (data as typeof data & { sync?: { remote_switch_id: string; mappings: { local_port_id: string; remote_port_id: string }[]; port_mode: string; access_vlan: number | null; native_vlan: number | null; tagged_vlans: number[] } }).sync
    if (sync && data.remote_device_id !== undefined && data.remote_device_id !== sync.remote_switch_id) throw createError({ statusCode: 409, message: 'remote_device_id must match sync.remote_switch_id' })
    if (sync && data.remote_device_id !== sync.remote_switch_id) throw createError({ statusCode: 409, message: 'remote_device_id must match sync.remote_switch_id' })
    try {
      const row = await prisma.$transaction(async (tx) => {
      if (!normalizedName) {
        throw createError({ statusCode: 400, message: 'LAG group name must not be empty' })
      }
      const duplicate = await tx.lagGroup.findFirst({ where: { switch_id: switchId, name: normalizedName } })
      if (duplicate) {
        throw createError({ statusCode: 409, message: `LAG group name '${normalizedName}' already exists on this switch` })
      }
       const selected = await tx.port.findMany({ where: { id: { in: data.port_ids } }, select: { id: true, switch_id: true, lag_group_id: true, connected_port_id: true } })
      if (selected.length !== data.port_ids.length || selected.some(p => p.switch_id !== switchId)) throw createError({ statusCode: 400, message: `Port does not belong to switch ${sw.name}` })
       if (selected.some(p => p.lag_group_id)) throw createError({ statusCode: 409, message: 'Port is already in another LAG group' })
       if (sync) {
         const localIds = new Set(sync.mappings.map(m => m.local_port_id))
         if (localIds.size !== data.port_ids.length || data.port_ids.some(id => !localIds.has(id))) throw createError({ statusCode: 409, message: 'Sync mappings must cover all local LAG members' })
       }
       const remote = sync ? await tx.port.findMany({ where: { id: { in: sync.mappings.map(m => m.remote_port_id) } } }) : []
       if (sync && (remote.length !== sync.mappings.length || remote.some(p => p.switch_id !== sync.remote_switch_id || p.lag_group_id || p.connected_port_id))) throw createError({ statusCode: 409, message: 'Remote ports are invalid, connected, or already in a LAG' })
       if (selected.some(p => p.lag_group_id || false)) throw createError({ statusCode: 409, message: 'Port is already in another LAG group' })
       if (sync && selected.some(p => (p as typeof p & { connected_port_id?: string | null }).connected_port_id)) throw createError({ statusCode: 409, message: 'Local ports are already connected' })
       const created = await tx.lagGroup.create({ data: { id: newId, switch_id: switchId, name: normalizedName, remote_device: data.remote_device ?? null, remote_device_id: data.remote_device_id ?? null, description: data.description ?? null, created_at: now, updated_at: now } })
      const claimed = await tx.port.updateMany({ where: { id: { in: data.port_ids }, switch_id: switchId, lag_group_id: null }, data: { lag_group_id: newId } })
      if (claimed.count !== data.port_ids.length) throw createError({ statusCode: 409, message: 'Selected ports could not be claimed' })
      if (sync) {
        if (new Set(sync.mappings.map(m => m.local_port_id)).size !== sync.mappings.length || new Set(sync.mappings.map(m => m.remote_port_id)).size !== sync.mappings.length) throw createError({ statusCode: 409, message: 'LAG port mappings must be unique' })
        if (sync.port_mode === 'access' && (sync.native_vlan !== null || sync.tagged_vlans.length)) throw createError({ statusCode: 409, message: 'Access ports cannot have native or tagged VLANs' })
        if (sync.port_mode === 'trunk' && sync.access_vlan !== null) throw createError({ statusCode: 409, message: 'Trunk ports cannot have an access VLAN' })
         const localIds = new Set(sync.mappings.map(m => m.local_port_id))
         if (sync.mappings.some(m => !localIds.has(m.local_port_id) || !data.port_ids.includes(m.local_port_id))) throw createError({ statusCode: 409, message: 'Sync mappings must use local LAG members' })
        const remoteLag = await tx.lagGroup.create({ data: { id: randomUUID(), switch_id: sync.remote_switch_id, name: normalizedName, remote_device: null, remote_device_id: switchId, description: data.description ?? null, created_at: now, updated_at: now } })
        const vlanData = { port_mode: sync.port_mode, access_vlan: sync.access_vlan, native_vlan: sync.native_vlan, tagged_vlans: JSON.stringify(sync.tagged_vlans) }
        await tx.port.updateMany({ where: { id: { in: remote.map(p => p.id) } }, data: { lag_group_id: remoteLag.id, ...vlanData } })
        await tx.port.updateMany({ where: { id: { in: data.port_ids } }, data: vlanData })
        for (const m of sync.mappings) {
          const l = await tx.port.findUnique({ where: { id: m.local_port_id } }); const r = remote.find(p => p.id === m.remote_port_id)!
          await tx.port.update({ where: { id: l!.id }, data: { connected_device_id: sync.remote_switch_id, connected_port_id: r.id, connected_port: r.label } })
          await tx.port.update({ where: { id: r.id }, data: { connected_device_id: switchId, connected_port_id: l!.id, connected_port: l!.label } })
        }
        const vlanIds = [...new Set(sync.tagged_vlans.concat(sync.access_vlan ?? [], sync.native_vlan ?? []))]
        const switches = await tx.switch.findMany({ where: { id: { in: [switchId, sync.remote_switch_id] } }, select: { id: true, site_id: true, configured_vlans: true } })
        const sites = [...new Set(switches.map(s => s.site_id))]
        const existing = await tx.vlan.findMany({ where: { site_id: { in: sites }, vlan_id: { in: vlanIds } } })
        if (existing.length < sites.length * vlanIds.length) throw createError({ statusCode: 409, message: 'Configured VLAN does not exist on both switch sites' })
        for (const s of switches) await tx.switch.update({ where: { id: s.id }, data: { configured_vlans: JSON.stringify([...new Set<number>((JSON.parse(s.configured_vlans) as number[]).concat(vlanIds))].sort((a, b) => a - b)) } })
      }
      return created
    })
      return rowToLag(row)
    } catch (error: any) {
      if (error?.code === 'P2002') throw createError({ statusCode: 409, message: `LAG group name '${normalizedName}' already exists on this switch` })
      throw error
    }
  },

  async update(id: string, data: Partial<Omit<LAGGroup, 'id' | 'switch_id' | 'created_at'>>, expectedSwitchId?: string): Promise<LAGGroup> {
    const current = await prisma.lagGroup.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'LAG group not found' })
    }

    if (data.port_ids && (data.port_ids.length < 2 || new Set(data.port_ids).size !== data.port_ids.length)) throw createError({ statusCode: 400, message: 'A LAG group requires at least two distinct ports' })
    const updatedAt = new Date().toISOString()
    const sync = (data as typeof data & { sync?: { remote_switch_id: string; mappings: { local_port_id: string; remote_port_id: string }[]; port_mode: string; access_vlan: number | null; native_vlan: number | null; tagged_vlans: number[] } }).sync
    if (sync && current.remote_device_id && sync.remote_switch_id !== current.remote_device_id) throw createError({ statusCode: 409, message: 'Remote switch cannot be changed for an existing synced LAG' })
    if (current.remote_device_id && !sync && (data.port_ids || data.name !== undefined || data.remote_device !== undefined || data.remote_device_id !== undefined)) throw createError({ statusCode: 409, message: 'Remote LAG changes require a complete sync payload' })
    if (sync && data.remote_device_id !== undefined && data.remote_device_id !== sync.remote_switch_id) throw createError({ statusCode: 409, message: 'remote_device_id must match sync.remote_switch_id' })
    const normalizedName = data.name?.trim()
    try {
    const row = await prisma.$transaction(async (tx) => {
      const lockedCurrent = await tx.lagGroup.findUnique({ where: { id } })
      if (!lockedCurrent || (expectedSwitchId && lockedCurrent.switch_id !== expectedSwitchId)) throw createError({ statusCode: 404, message: 'LAG group not found' })
      if (sync) {
        const mappings = sync.mappings
        if (new Set(mappings.map(m => m.local_port_id)).size !== mappings.length || new Set(mappings.map(m => m.remote_port_id)).size !== mappings.length) throw createError({ statusCode: 409, message: 'LAG port mappings must be unique' })
        if (new Set(mappings.map(m => m.local_port_id)).size !== mappings.length || new Set(mappings.map(m => m.remote_port_id)).size !== mappings.length) throw createError({ statusCode: 409, message: 'LAG port mappings must be unique' })
        const localPorts = await tx.port.findMany({ where: { id: { in: mappings.map(m => m.local_port_id) } } })
        const remotePorts = await tx.port.findMany({ where: { id: { in: mappings.map(m => m.remote_port_id) } } })
        if (localPorts.length !== mappings.length || localPorts.some(p => p.switch_id !== current.switch_id) || remotePorts.length !== mappings.length || remotePorts.some(p => p.switch_id !== sync.remote_switch_id)) throw createError({ statusCode: 409, message: 'LAG ports do not belong to the expected switches' })
        if (localPorts.some(p => p.lag_group_id && p.lag_group_id !== id)) throw createError({ statusCode: 409, message: 'A mapped port belongs to another LAG group' })
        const candidates = await tx.lagGroup.findMany({ where: { switch_id: sync.remote_switch_id, remote_device_id: current.switch_id } })
        const coupled = [] as typeof candidates
       const oldLocalPorts = await tx.port.findMany({ where: { lag_group_id: id } })
         const expectedLocalIds = new Set((data.port_ids ?? oldLocalPorts.map(p => p.id)))
         if (expectedLocalIds.size !== mappings.length || [...expectedLocalIds].some(portId => !mappings.some(m => m.local_port_id === portId))) throw createError({ statusCode: 409, message: 'Sync mappings must cover all local LAG members' })
        for (const candidate of candidates) {
          const members = await tx.port.findMany({ where: { lag_group_id: candidate.id } })
          const valid = members.length === oldLocalPorts.length && oldLocalPorts.every(l => {
            const r = members.find(p => p.id === l.connected_port_id)
            return !!r && l.connected_device_id === sync.remote_switch_id && r.connected_port_id === l.id && r.connected_device_id === current.switch_id
          })
          if (valid) coupled.push(candidate)
        }
        if (candidates.length > 0 && (candidates.length !== 1 || coupled.length !== 1)) throw createError({ statusCode: 409, message: 'Remote mirror cannot be uniquely and safely identified; nothing was updated' })
        const remoteLag = coupled[0] ?? await tx.lagGroup.create({ data: { id: randomUUID(), switch_id: sync.remote_switch_id, name: normalizedName ?? current.name, remote_device: null, remote_device_id: current.switch_id, description: null, created_at: updatedAt, updated_at: updatedAt } })
        if (remotePorts.some(p => p.lag_group_id && p.lag_group_id !== remoteLag.id)) throw createError({ statusCode: 409, message: 'A mapped port belongs to another LAG group' })
        const oldRemotePorts = await tx.port.findMany({ where: { lag_group_id: remoteLag.id } })
        const oldPairs = new Map([...oldLocalPorts, ...oldRemotePorts].map(p => [p.id, p.connected_port_id]))
        const newPairs = new Map<string, string>([
          ...mappings.map(m => [m.local_port_id, m.remote_port_id] as [string, string]),
          ...mappings.map(m => [m.remote_port_id, m.local_port_id] as [string, string])
        ])
        const affected = new Set([...oldLocalPorts, ...oldRemotePorts].map(p => p.id))
        for (const p of [...localPorts, ...remotePorts]) {
          if (p.connected_port_id && newPairs.get(p.id) !== p.connected_port_id && !(oldPairs.has(p.id) && affected.has(p.connected_port_id))) throw createError({ statusCode: 409, message: 'Mapped port is already connected to an external peer' })
        }
        for (const p of [...oldLocalPorts, ...oldRemotePorts]) {
          if (p.connected_port_id && affected.has(p.connected_port_id)) {
            const peer = [...oldLocalPorts, ...oldRemotePorts].find(candidate => candidate.id === p.connected_port_id)
            if (peer?.connected_port_id === p.id) await tx.port.updateMany({ where: { id: { in: [p.id, peer.id] } }, data: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null } })
          }
        }
        await tx.port.updateMany({ where: { lag_group_id: remoteLag.id, id: { notIn: remotePorts.map(p => p.id) } }, data: { lag_group_id: null } })
        await tx.port.updateMany({ where: { lag_group_id: id, id: { notIn: localPorts.map(p => p.id) } }, data: { lag_group_id: null } })
        const vlanData = { port_mode: sync.port_mode, access_vlan: sync.access_vlan, native_vlan: sync.native_vlan, tagged_vlans: JSON.stringify(sync.tagged_vlans) }
        await tx.port.updateMany({ where: { id: { in: mappings.map(m => m.local_port_id) } }, data: { lag_group_id: id, ...vlanData } })
        await tx.port.updateMany({ where: { id: { in: mappings.map(m => m.remote_port_id) } }, data: { lag_group_id: remoteLag.id, ...vlanData } })
        for (const m of mappings) {
          const local = localPorts.find(p => p.id === m.local_port_id)!; const remote = remotePorts.find(p => p.id === m.remote_port_id)!
          await tx.port.update({ where: { id: local.id }, data: { connected_device_id: sync.remote_switch_id, connected_port_id: remote.id, connected_device: null, connected_port: remote.label } })
          await tx.port.update({ where: { id: remote.id }, data: { connected_device_id: current.switch_id, connected_port_id: local.id, connected_device: null, connected_port: local.label } })
        }
        if (sync.port_mode === 'access' && (sync.native_vlan !== null || sync.tagged_vlans.length)) throw createError({ statusCode: 409, message: 'Access ports cannot have native or tagged VLANs' })
        if (sync.port_mode === 'trunk' && sync.access_vlan !== null) throw createError({ statusCode: 409, message: 'Trunk ports cannot have an access VLAN' })
        const vlanIds = [...new Set(sync.tagged_vlans.concat(sync.access_vlan ?? [], sync.native_vlan ?? []))]
        const switches = await tx.switch.findMany({ where: { id: { in: [current.switch_id, sync.remote_switch_id] } }, select: { id: true, site_id: true, configured_vlans: true } })
        const sites = [...new Set(switches.map(s => s.site_id))]
        if ((await tx.vlan.findMany({ where: { site_id: { in: sites }, vlan_id: { in: vlanIds } }, select: { site_id: true, vlan_id: true } })).length < sites.length * vlanIds.length) throw createError({ statusCode: 409, message: 'Configured VLAN does not exist on both switch sites' })
        for (const sw of switches) {
          const configured = JSON.parse(sw.configured_vlans) as number[]
          await tx.switch.update({ where: { id: sw.id }, data: { configured_vlans: JSON.stringify([...new Set<number>(configured.concat(vlanIds))].sort((a, b) => a - b)) } })
        }
        await tx.lagGroup.update({ where: { id: remoteLag.id }, data: { name: normalizedName ?? current.name, updated_at: updatedAt } })
      }
      if (data.name !== undefined) {
        if (!normalizedName) {
          throw createError({ statusCode: 400, message: 'LAG group name must not be empty' })
        }
        const duplicate = await tx.lagGroup.findFirst({
          where: { switch_id: current.switch_id, name: normalizedName, NOT: { id } }
        })
        if (duplicate) {
          throw createError({ statusCode: 409, message: `LAG group name '${normalizedName}' already exists on this switch` })
        }
      }
      if (data.port_ids) {
        const selectedPorts = await tx.port.findMany({
          where: { id: { in: data.port_ids } },
          select: { id: true, switch_id: true, lag_group_id: true }
        })
        if (selectedPorts.length !== new Set(data.port_ids).size || selectedPorts.some(port => port.switch_id !== current.switch_id)) {
          throw createError({ statusCode: 400, message: 'Port does not belong to switch' })
        }
        const conflictingPort = selectedPorts.find(port => port.lag_group_id && port.lag_group_id !== id)
        if (conflictingPort) {
          const lag = await tx.lagGroup.findUnique({ where: { id: conflictingPort.lag_group_id! }, select: { name: true } })
          throw createError({ statusCode: 409, message: `Port is already in LAG group '${lag?.name ?? conflictingPort.lag_group_id}'` })
        }
        const claimed = await tx.port.updateMany({ where: { id: { in: data.port_ids }, switch_id: current.switch_id, OR: [{ lag_group_id: null }, { lag_group_id: id }] }, data: { lag_group_id: id } })
        if (claimed.count !== data.port_ids.length) throw createError({ statusCode: 409, message: 'Selected ports could not be claimed' })
        // Detach only after the requested set was successfully claimed.
        await tx.port.updateMany({
          where: { lag_group_id: id, NOT: { id: { in: data.port_ids } } },
          data: { lag_group_id: null }
        })
      }
      return tx.lagGroup.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: normalizedName } : {}),
          ...(data.remote_device !== undefined ? { remote_device: data.remote_device ?? null } : {}),
          ...(sync ? { remote_device_id: sync.remote_switch_id } : data.remote_device_id !== undefined ? { remote_device_id: data.remote_device_id ?? null } : {}),
          ...(data.description !== undefined ? { description: data.description ?? null } : {}),
          updated_at: updatedAt
        }
      })
      })
    return rowToLag(row)
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw createError({ statusCode: 409, message: `LAG group name '${normalizedName ?? current.name}' already exists on this switch` })
      }
      throw error
    }

  },

  async delete(id: string, options: { delete_remote?: boolean } = {}): Promise<boolean> {
    await prisma.$transaction(async (tx) => {
        const local = await tx.lagGroup.findUnique({ where: { id } })
        if (!local) throw createError({ statusCode: 404, message: 'LAG group not found' })
        // Sever the inter-switch links of the member ports on BOTH ends, then
        // delete the group. Without this the cross-connections survive a LAG
        // delete (the peer keeps pointing back). Port.lag_group_id is cleared by
        // the schema's onDelete: SetNull.
        const members = await tx.port.findMany({
          where: { lag_group_id: id },
          select: { id: true, switch_id: true, connected_port_id: true, connected_device_id: true }
        })
        const clearLinks = async (ports: typeof members) => { for (const m of ports) {
          if (m.connected_port_id) {
             const peer = await tx.port.findUnique({ where: { id: m.connected_port_id }, select: { switch_id: true, connected_port_id: true, connected_device_id: true } })
             if (peer?.connected_port_id === m.id && peer.connected_device_id === m.switch_id && m.connected_device_id === peer.switch_id) {
               await tx.port.update({ where: { id: m.id }, data: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null } })
               await tx.port.update({ where: { id: m.connected_port_id }, data: { connected_device: null, connected_device_id: null, connected_port_id: null, connected_port: null } })
            }
          }
        } }
        if (options.delete_remote) {
           if (!local.remote_device_id) throw createError({ statusCode: 409, message: 'Remote mirror cannot be uniquely and safely identified; nothing was deleted' })
          const candidates = await tx.lagGroup.findMany({ where: { switch_id: local.remote_device_id, remote_device_id: local.switch_id } })
          const coupled = []
          for (const candidate of candidates) {
            const remoteMembers = await tx.port.findMany({ where: { lag_group_id: candidate.id }, select: { id: true, switch_id: true, connected_port_id: true, connected_device_id: true } })
              const valid = members.length === remoteMembers.length && members.every(localMember => {
                if (localMember.switch_id !== local.switch_id || !localMember.connected_port_id || !localMember.connected_device_id) return false
                const remote = remoteMembers.find(peer => peer.id === localMember.connected_port_id)
                return remote !== undefined && remote.switch_id === local.remote_device_id && localMember.connected_device_id === remote.switch_id && remote.connected_port_id === localMember.id && remote.connected_device_id === localMember.switch_id
              })
            if (valid) coupled.push(candidate)
          }
            if (coupled.length !== 1) throw createError({ statusCode: 409, message: 'Remote mirror cannot be uniquely and safely identified; nothing was deleted' })
          const remoteMembers = await tx.port.findMany({ where: { lag_group_id: coupled[0]!.id }, select: { id: true, switch_id: true, connected_port_id: true, connected_device_id: true } })
          await clearLinks(remoteMembers)
            await tx.lagGroup.delete({ where: { id: coupled[0]!.id } })
          } else if (local.remote_device_id) {
            const candidates = await tx.lagGroup.findMany({ where: { switch_id: local.remote_device_id, remote_device_id: local.switch_id } })
            const coupled = []
            for (const candidate of candidates) {
              const remoteMembers = await tx.port.findMany({ where: { lag_group_id: candidate.id }, select: { id: true, switch_id: true, connected_port_id: true, connected_device_id: true } })
               if (members.length === remoteMembers.length && members.every(member => {
                 if (!member.connected_port_id || !member.connected_device_id) return false
                 const peer = remoteMembers.find(remote => remote.id === member.connected_port_id)
                return peer !== undefined && member.connected_device_id === peer.switch_id && peer.connected_port_id === member.id && peer.connected_device_id === member.switch_id
              })) coupled.push(candidate)
            }
            if (coupled.length === 1) await tx.lagGroup.update({ where: { id: coupled[0]!.id }, data: { remote_device: null, remote_device_id: null } })
          }
        await clearLinks(members)
        await tx.lagGroup.delete({ where: { id } })
      })
    return true
  },

  async deleteBySwitchId(switchId: string): Promise<number> {
    const result = await prisma.lagGroup.deleteMany({ where: { switch_id: switchId } })
    return result.count
  }
}
