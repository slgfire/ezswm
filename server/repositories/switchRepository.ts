import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

import { prisma } from '../db/client'
import type { Switch } from '../../types/switch'
import type { Port, PortSpeed, PortType, PortStatus, PortMode, PortHelperUsage } from '../../types/port'
import type { PoeConfig } from '../../types/layoutTemplate'
import { layoutTemplateRepository } from './layoutTemplateRepository'
import { isValidIPv4, isIPInSubnet } from '../utils/ipv4'
import { incrementMemberLabel } from '../utils/deviceLibrary'
import { slugify, resolveSlugCollision } from '../utils/slugify'
import { resolveSiteIdToUuid } from '../utils/resolveSiteParam'

type TxClient = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

interface PortRow {
  id: string
  switch_id: string
  unit: number
  index: number
  label: string | null
  type: string
  speed: string | null
  status: string
  port_mode: string | null
  access_vlan: number | null
  native_vlan: number | null
  tagged_vlans: string
  connected_device: string | null
  connected_device_id: string | null
  connected_port_id: string | null
  connected_port: string | null
  description: string | null
  mac_address: string | null
  lag_group_id: string | null
  connected_allocation_id: string | null
  poe: string | null
  helper_usage: string | null
  helper_label: string | null
  show_in_helper_list: boolean | null
}

interface SwitchRow {
  id: string
  site_id: string
  slug: string
  name: string
  model: string | null
  manufacturer: string | null
  serial_number: string | null
  location: string | null
  rack_position: string | null
  management_ip: string | null
  firmware_version: string | null
  layout_template_id: string | null
  stack_size: number | null
  role: string | null
  tags: string
  configured_vlans: string
  is_favorite: boolean
  sort_order: number | null
  notes: string | null
  created_at: string
  updated_at: string
  ports?: PortRow[]
}

function rowToPort(row: PortRow): Port {
  return {
    id: row.id,
    unit: row.unit,
    index: row.index,
    label: row.label ?? undefined,
    type: row.type as PortType,
    speed: (row.speed as PortSpeed | null) ?? undefined,
    status: row.status as PortStatus,
    port_mode: (row.port_mode as PortMode | null) ?? undefined,
    access_vlan: row.access_vlan ?? undefined,
    native_vlan: row.native_vlan ?? undefined,
    tagged_vlans: JSON.parse(row.tagged_vlans) as number[],
    connected_device: row.connected_device ?? undefined,
    connected_device_id: row.connected_device_id ?? undefined,
    connected_port_id: row.connected_port_id ?? undefined,
    connected_port: row.connected_port ?? undefined,
    description: row.description ?? undefined,
    mac_address: row.mac_address ?? undefined,
    lag_group_id: row.lag_group_id ?? undefined,
    connected_allocation_id: row.connected_allocation_id ?? undefined,
    poe: row.poe === null ? null : (JSON.parse(row.poe) as PoeConfig),
    helper_usage: (row.helper_usage as PortHelperUsage | null) ?? undefined,
    helper_label: row.helper_label ?? undefined,
    show_in_helper_list: row.show_in_helper_list ?? undefined
  }
}

function rowToSwitch(row: SwitchRow): Switch {
  const ports = (row.ports ?? []).map(rowToPort)
  return {
    id: row.id,
    site_id: row.site_id,
    slug: row.slug,
    name: row.name,
    model: row.model ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    serial_number: row.serial_number ?? undefined,
    location: row.location ?? undefined,
    rack_position: row.rack_position ?? undefined,
    management_ip: row.management_ip ?? undefined,
    firmware_version: row.firmware_version ?? undefined,
    layout_template_id: row.layout_template_id ?? undefined,
    stack_size: row.stack_size ?? undefined,
    role: (row.role as Switch['role']) ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    ports,
    configured_vlans: JSON.parse(row.configured_vlans) as number[],
    is_favorite: row.is_favorite,
    sort_order: row.sort_order ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function portCreateInput(p: Partial<Port> & { id: string; unit: number; index: number; type: PortType; status: PortStatus }) {
  return {
    id: p.id,
    unit: p.unit,
    index: p.index,
    label: p.label ?? null,
    type: p.type,
    speed: p.speed ?? null,
    status: p.status,
    port_mode: p.port_mode ?? null,
    access_vlan: p.access_vlan ?? null,
    native_vlan: p.native_vlan ?? null,
    tagged_vlans: JSON.stringify(p.tagged_vlans ?? []),
    connected_device: p.connected_device ?? null,
    connected_device_id: p.connected_device_id ?? null,
    connected_port_id: p.connected_port_id ?? null,
    connected_port: p.connected_port ?? null,
    description: p.description ?? null,
    mac_address: p.mac_address ?? null,
    lag_group_id: p.lag_group_id ?? null,
    connected_allocation_id: p.connected_allocation_id ?? null,
    poe: p.poe === null || p.poe === undefined ? null : JSON.stringify(p.poe),
    helper_usage: p.helper_usage ?? null,
    helper_label: p.helper_label ?? null,
    show_in_helper_list: p.show_in_helper_list ?? null
  }
}

function portUpdateInput(p: Partial<Omit<Port, 'id' | 'unit' | 'index'>>) {
  const out: Record<string, unknown> = {}
  if (p.label !== undefined) out.label = p.label ?? null
  if (p.type !== undefined) out.type = p.type
  if (p.speed !== undefined) out.speed = p.speed ?? null
  if (p.status !== undefined) out.status = p.status
  if (p.port_mode !== undefined) out.port_mode = p.port_mode ?? null
  if (p.access_vlan !== undefined) out.access_vlan = p.access_vlan ?? null
  if (p.native_vlan !== undefined) out.native_vlan = p.native_vlan ?? null
  if (p.tagged_vlans !== undefined) out.tagged_vlans = JSON.stringify(p.tagged_vlans)
  if (p.connected_device !== undefined) out.connected_device = p.connected_device ?? null
  if (p.connected_device_id !== undefined) out.connected_device_id = p.connected_device_id ?? null
  if (p.connected_port_id !== undefined) out.connected_port_id = p.connected_port_id ?? null
  if (p.connected_port !== undefined) out.connected_port = p.connected_port ?? null
  if (p.description !== undefined) out.description = p.description ?? null
  if (p.mac_address !== undefined) out.mac_address = p.mac_address ?? null
  if (p.lag_group_id !== undefined) out.lag_group_id = p.lag_group_id ?? null
  if (p.connected_allocation_id !== undefined) out.connected_allocation_id = p.connected_allocation_id ?? null
  if (p.poe !== undefined) out.poe = p.poe === null ? null : JSON.stringify(p.poe)
  if (p.helper_usage !== undefined) out.helper_usage = p.helper_usage ?? null
  if (p.helper_label !== undefined) out.helper_label = p.helper_label ?? null
  if (p.show_in_helper_list !== undefined) out.show_in_helper_list = p.show_in_helper_list ?? null
  return out
}

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

async function generatePortsFromTemplate(templateId: string, stackSize: number = 1): Promise<Port[]> {
  const template = await layoutTemplateRepository.getById(templateId)
  if (!template) return []

  const ports: Port[] = []
  const baseUnits = template.units

  for (let member = 1; member <= stackSize; member++) {
    for (const unit of baseUnits) {
      const unitOffset = (member - 1) * baseUnits.length
      for (const block of unit.blocks) {
        const memberLabel = block.label ? incrementMemberLabel(block.label, member) : block.label

        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          ports.push({
            id: randomUUID(),
            unit: unit.unit_number + unitOffset,
            index: portIndex,
            label: generatePortLabel(memberLabel, unit.unit_number + unitOffset, portIndex),
            type: block.type,
            speed: block.default_speed as PortSpeed | undefined,
            status: 'down',
            tagged_vlans: [],
            ...(block.poe ? { poe: { ...block.poe } } : {})
          })
        }
      }
    }
  }
  return ports
}

function normalizeConfiguredVlans(vlans: number[]): number[] {
  return [...new Set(vlans)]
    .filter(v => Number.isInteger(v) && v >= 1 && v <= 4094)
    .sort((a, b) => a - b)
}

/**
 * If the switch's management_ip falls inside a known network, ensure the
 * matching IpAllocation reflects this switch as its owner. Best-effort —
 * errors are logged but do not interrupt the caller. Runs inside the caller's
 * transaction if a tx is supplied.
 */
async function syncManagementIpAllocation(
  tx: TxClient,
  switchId: string,
  switchName: string,
  newIp: string | undefined,
  oldIp?: string
): Promise<void> {
  try {
    if (oldIp && oldIp !== newIp) {
      await tx.ipAllocation.deleteMany({
        where: {
          ip_address: oldIp,
          description: { startsWith: 'Management IP for switch:' }
        }
      })
    }

    if (!newIp || !isValidIPv4(newIp)) return

    const networks = await tx.network.findMany({
      select: { id: true, subnet: true }
    })
    const matchingNetwork = networks.find(n => isIPInSubnet(newIp, n.subnet))
    if (!matchingNetwork) return

    const now = new Date().toISOString()
    const desc = `Management IP for switch: ${switchName}`

    const existing = await tx.ipAllocation.findFirst({ where: { ip_address: newIp } })
    if (existing) {
      await tx.ipAllocation.update({
        where: { id: existing.id },
        data: {
          hostname: switchName,
          device_type: 'switch',
          description: desc,
          updated_at: now
        }
      })
    } else {
      await tx.ipAllocation.create({
        data: {
          id: randomUUID(),
          network_id: matchingNetwork.id,
          ip_address: newIp,
          hostname: switchName,
          device_type: 'switch',
          description: desc,
          status: 'active',
          created_at: now,
          updated_at: now
        }
      })
    }
  } catch (err) {
    console.warn(`[ezSWM] syncManagementIpAllocation(${switchId}) failed (best-effort):`, err)
  }
}

const includePorts = { ports: { orderBy: [{ unit: 'asc' as const }, { index: 'asc' as const }] } }

async function uniqueSwitchSlug(siteId: string, desired: string, excludeId?: string): Promise<string> {
  return resolveSlugCollision(desired, async (candidate) => {
    const found = await prisma.switch.findUnique({
      where: { site_id_slug: { site_id: siteId, slug: candidate } }
    })
    if (!found) return false
    return excludeId !== found.id
  })
}

export const switchRepository = {
  async list(siteId?: string): Promise<Switch[]> {
    const rows = await prisma.switch.findMany({
      where: siteId ? { site_id: siteId } : undefined,
      include: includePorts,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }]
    })
    return rows.map(rowToSwitch)
  },

  async updateSortOrder(order: string[]): Promise<void> {
    await prisma.$transaction(
      order.map((id, i) => prisma.switch.update({ where: { id }, data: { sort_order: i } }))
    )
  },

  /**
   * Lookup by primary key. Falls back to a *globally unique* slug match so that
   * `/sites/<slug>/switches/<switch-slug>` works without the caller needing to
   * pass an explicit site context. If the slug exists in multiple sites (a
   * conflict the schema allows because `(site_id, slug)` is per-site unique),
   * the lookup returns `null` — callers that know the site context should use
   * `getBySlug(siteId, slug)` instead.
   */
  async getById(identifier: string): Promise<Switch | null> {
    const byPk = await prisma.switch.findUnique({ where: { id: identifier }, include: includePorts })
    if (byPk) return rowToSwitch(byPk)
    const matches = await prisma.switch.findMany({ where: { slug: identifier }, include: includePorts })
    if (matches.length === 1) return rowToSwitch(matches[0]!)
    return null
  },

  async getBySlug(siteId: string, slug: string): Promise<Switch | null> {
    const row = await prisma.switch.findUnique({
      where: { site_id_slug: { site_id: siteId, slug } },
      include: includePorts
    })
    return row ? rowToSwitch(row) : null
  },

  /**
   * Resolve a route param that may hold either a UUID id or a site-scoped slug.
   * Falls back to id-only when no siteId is available (e.g. /api/switches/[id]
   * routes that don't pin the lookup to a site).
   */
  async getByIdOrSlug(identifier: string, siteId?: string): Promise<Switch | null> {
    // When a site is known, try the per-site slug first — that disambiguates
    // the case where the same slug exists on multiple sites (per-site unique,
    // not globally), which would otherwise make `getById` return null.
    if (siteId) {
      const scoped = await this.getBySlug(siteId, identifier)
      if (scoped) return scoped
    }
    return this.getById(identifier)
  },

  async create(data: Omit<Switch, 'id' | 'slug' | 'ports' | 'created_at' | 'updated_at' | 'is_favorite'> & { slug?: string }): Promise<Switch> {
    // site_id may arrive as a UUID or a slug; resolve before any lookups.
    const siteUuid = await resolveSiteIdToUuid(data.site_id)

    const nameClash = await prisma.switch.findFirst({
      where: { site_id: siteUuid, name: data.name }
    })
    if (nameClash) {
      throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists in this site` })
    }

    const desiredSlug = data.slug ? slugify(data.slug) : slugify(data.name)
    const slug = await uniqueSwitchSlug(siteUuid, desiredSlug)

    const ports = data.layout_template_id
      ? await generatePortsFromTemplate(data.layout_template_id, data.stack_size ?? 1)
      : []

    const now = new Date().toISOString()
    const newId = randomUUID()

    const result = await prisma.$transaction(async (tx) => {
      await tx.switch.create({
        data: {
          id: newId,
          site_id: siteUuid,
          slug,
          name: data.name,
          model: data.model ?? null,
          manufacturer: data.manufacturer ?? null,
          serial_number: data.serial_number ?? null,
          location: data.location ?? null,
          rack_position: data.rack_position ?? null,
          management_ip: data.management_ip ?? null,
          firmware_version: data.firmware_version ?? null,
          layout_template_id: data.layout_template_id ?? null,
          stack_size: data.stack_size ?? null,
          role: data.role ?? null,
          tags: JSON.stringify(data.tags ?? []),
          configured_vlans: JSON.stringify([]),
          is_favorite: false,
          sort_order: data.sort_order ?? null,
          notes: data.notes ?? null,
          created_at: now,
          updated_at: now
        }
      })

      if (ports.length > 0) {
        await tx.port.createMany({
          data: ports.map(p => ({ switch_id: newId, ...portCreateInput(p as Parameters<typeof portCreateInput>[0]) }))
        })
      }

      if (data.management_ip) {
        await syncManagementIpAllocation(tx, newId, data.name, data.management_ip)
      }

      const row = await tx.switch.findUniqueOrThrow({ where: { id: newId }, include: includePorts })
      return rowToSwitch(row)
    })

    return result
  },

  async update(idOrSlug: string, data: Partial<Omit<Switch, 'id' | 'ports' | 'created_at'>>, siteId?: string): Promise<Switch> {
    // Accept either a UUID or a slug. When a site is known, try the per-site
    // slug first so callers on /sites/<site>/switches/<slug> can resolve even
    // when the slug isn't globally unique.
    let current = null
    if (siteId) {
      current = await prisma.switch.findUnique({
        where: { site_id_slug: { site_id: siteId, slug: idOrSlug } },
        include: includePorts
      })
    }
    if (!current) current = await prisma.switch.findUnique({ where: { id: idOrSlug }, include: includePorts })
    if (!current) {
      const matches = await prisma.switch.findMany({ where: { slug: idOrSlug }, include: includePorts })
      if (matches.length === 1) current = matches[0]!
    }
    if (!current) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }
    const id = current.id

    if (data.name && data.name !== current.name) {
      const clash = await prisma.switch.findFirst({
        where: { site_id: current.site_id, name: data.name, NOT: { id } }
      })
      if (clash) {
        throw createError({ statusCode: 409, message: `Switch name '${data.name}' already exists in this site` })
      }
    }

    // Slug resolution: see siteRepository.update for the full rationale.
    let slug: string | undefined
    if (data.slug !== undefined && data.slug !== current.slug) {
      slug = await uniqueSwitchSlug(current.site_id, slugify(data.slug), id)
    } else if (data.name !== undefined && data.name !== current.name) {
      slug = await uniqueSwitchSlug(current.site_id, slugify(data.name), id)
    }

    const templateChanged = data.layout_template_id !== undefined && data.layout_template_id !== current.layout_template_id
    const stackChanged = data.stack_size !== undefined && data.stack_size !== current.stack_size
    const regeneratePorts = templateChanged || stackChanged
    const newTemplateId = data.layout_template_id ?? current.layout_template_id
    const newStackSize = data.stack_size ?? current.stack_size ?? 1
    const newPorts = regeneratePorts && newTemplateId
      ? await generatePortsFromTemplate(newTemplateId, newStackSize)
      : null

    const oldManagementIp = current.management_ip
    const oldName = current.name

    const updated = await prisma.$transaction(async (tx) => {
      await tx.switch.update({
        where: { id },
        data: {
          ...(data.site_id !== undefined ? { site_id: data.site_id } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.model !== undefined ? { model: data.model ?? null } : {}),
          ...(data.manufacturer !== undefined ? { manufacturer: data.manufacturer ?? null } : {}),
          ...(data.serial_number !== undefined ? { serial_number: data.serial_number ?? null } : {}),
          ...(data.location !== undefined ? { location: data.location ?? null } : {}),
          ...(data.rack_position !== undefined ? { rack_position: data.rack_position ?? null } : {}),
          ...(data.management_ip !== undefined ? { management_ip: data.management_ip ?? null } : {}),
          ...(data.firmware_version !== undefined ? { firmware_version: data.firmware_version ?? null } : {}),
          ...(data.layout_template_id !== undefined ? { layout_template_id: data.layout_template_id ?? null } : {}),
          ...(data.stack_size !== undefined ? { stack_size: data.stack_size ?? null } : {}),
          ...(data.role !== undefined ? { role: data.role ?? null } : {}),
          ...(data.tags !== undefined ? { tags: JSON.stringify(data.tags) } : {}),
          ...(data.configured_vlans !== undefined ? { configured_vlans: JSON.stringify(normalizeConfiguredVlans(data.configured_vlans)) } : {}),
          ...(data.is_favorite !== undefined ? { is_favorite: data.is_favorite } : {}),
          ...(data.sort_order !== undefined ? { sort_order: data.sort_order ?? null } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
          ...(slug !== undefined ? { slug } : {}),
          updated_at: new Date().toISOString()
        }
      })

      if (newPorts) {
        await tx.port.deleteMany({ where: { switch_id: id } })
        await tx.port.createMany({
          data: newPorts.map(p => ({ switch_id: id, ...portCreateInput(p as Parameters<typeof portCreateInput>[0]) }))
        })
      }

      const newManagementIp = data.management_ip !== undefined ? (data.management_ip ?? undefined) : (oldManagementIp ?? undefined)
      const newName = data.name ?? oldName
      if (newManagementIp !== (oldManagementIp ?? undefined) || (newName !== oldName && newManagementIp)) {
        await syncManagementIpAllocation(tx, id, newName, newManagementIp, oldManagementIp ?? undefined)
      }

      const row = await tx.switch.findUniqueOrThrow({ where: { id }, include: includePorts })
      return rowToSwitch(row)
    })

    return updated
  },

  async updatePort(switchId: string, portId: string, data: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Promise<Port> {
    const updated = await prisma.$transaction(async (tx) => {
      const oldPort = await tx.port.findUnique({ where: { id: portId } })
      if (!oldPort || oldPort.switch_id !== switchId) {
        throw createError({ statusCode: 404, message: 'Port not found' })
      }

      // Remove old bidirectional link if changed/removed.
      if (oldPort.connected_device_id && oldPort.connected_port_id) {
        const deviceChanged = data.connected_device_id !== undefined && data.connected_device_id !== oldPort.connected_device_id
        const portChanged = data.connected_port_id !== undefined && data.connected_port_id !== oldPort.connected_port_id
        const removed = data.connected_device_id === null || data.connected_device_id === undefined
        if (removed || deviceChanged || portChanged) {
          await tx.port.update({
            where: { id: oldPort.connected_port_id },
            data: {
              connected_device: null,
              connected_device_id: null,
              connected_port_id: null,
              connected_port: null
            }
          }).catch(() => { /* remote port may not exist anymore */ })
        }
      }

      const updatedRow = await tx.port.update({
        where: { id: portId },
        data: portUpdateInput(data)
      })

      // Add new bidirectional link if specified.
      if (data.connected_device_id && data.connected_port_id) {
        const localSwitch = await tx.switch.findUnique({ where: { id: switchId } })
        await tx.port.update({
          where: { id: data.connected_port_id },
          data: {
            connected_device: localSwitch?.name ?? null,
            connected_device_id: switchId,
            connected_port_id: portId,
            connected_port: updatedRow.label,
            connected_allocation_id: null,
            ...(updatedRow.speed !== null ? { speed: updatedRow.speed } : {}),
            ...(updatedRow.native_vlan !== null ? { native_vlan: updatedRow.native_vlan } : {}),
            tagged_vlans: updatedRow.tagged_vlans,
            ...(updatedRow.status === 'up' ? { status: 'up' } : {})
          }
        }).catch(() => { /* remote port may not exist */ })
      }

      await tx.switch.update({
        where: { id: switchId },
        data: { updated_at: new Date().toISOString() }
      })

      return updatedRow
    })

    return rowToPort(updated)
  },

  async bulkUpdatePorts(switchId: string, portIds: string[], updates: Partial<Omit<Port, 'id' | 'unit' | 'index'>>): Promise<Port[]> {
    const updated = await prisma.$transaction(async (tx) => {
      const rows: PortRow[] = []
      for (const portId of portIds) {
        const port = await tx.port.findUnique({ where: { id: portId } })
        if (!port || port.switch_id !== switchId) continue
        const row = await tx.port.update({ where: { id: portId }, data: portUpdateInput(updates) })
        rows.push(row)
      }
      await tx.switch.update({ where: { id: switchId }, data: { updated_at: new Date().toISOString() } })
      return rows
    })
    return updated.map(rowToPort)
  },

  async applyPortVlanUpdate(
    switchId: string,
    portId: string,
    portData: Partial<Omit<Port, 'id' | 'unit' | 'index'>>,
    options: { expectedUpdatedAt?: string; siteVlanIds?: number[] } = {}
  ): Promise<{ port: Port; updatedAt: string; vlansAddedToSwitch: number[] }> {
    return prisma.$transaction(async (tx) => {
      const sw = await tx.switch.findUnique({ where: { id: switchId } })
      if (!sw) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

      if (options.expectedUpdatedAt && sw.updated_at !== options.expectedUpdatedAt) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Switch was modified since page load',
          data: { current_updated_at: sw.updated_at }
        })
      }

      const port = await tx.port.findUnique({ where: { id: portId } })
      if (!port || port.switch_id !== switchId) throw createError({ statusCode: 404, statusMessage: 'Port not found' })

      const requestedVlans: number[] = []
      if (portData.access_vlan) requestedVlans.push(portData.access_vlan)
      if (portData.native_vlan) requestedVlans.push(portData.native_vlan)
      if (portData.tagged_vlans) requestedVlans.push(...portData.tagged_vlans)

      if (options.siteVlanIds && requestedVlans.length > 0) {
        for (const vlanId of requestedVlans) {
          if (!options.siteVlanIds.includes(vlanId)) {
            throw createError({ statusCode: 404, statusMessage: `VLAN ${vlanId} does not exist in this site` })
          }
        }
      }

      const configuredVlans = JSON.parse(sw.configured_vlans) as number[]
      const vlansToAdd = requestedVlans.filter(v => !configuredVlans.includes(v))

      const updatedAt = new Date().toISOString()

      if (vlansToAdd.length > 0) {
        await tx.switch.update({
          where: { id: switchId },
          data: {
            configured_vlans: JSON.stringify(normalizeConfiguredVlans([...configuredVlans, ...vlansToAdd])),
            updated_at: updatedAt
          }
        })
      } else {
        await tx.switch.update({ where: { id: switchId }, data: { updated_at: updatedAt } })
      }

      const updatedPort = await tx.port.update({ where: { id: portId }, data: portUpdateInput(portData) })

      return {
        port: rowToPort(updatedPort),
        updatedAt,
        vlansAddedToSwitch: vlansToAdd
      }
    })
  },

  async addVlansToSwitch(switchId: string, vlanIds: number[]): Promise<{ addedVlans: number[]; updatedAt: string }> {
    return prisma.$transaction(async (tx) => {
      const sw = await tx.switch.findUnique({ where: { id: switchId } })
      if (!sw) throw createError({ statusCode: 404, statusMessage: 'Target switch not found' })

      const configuredVlans = JSON.parse(sw.configured_vlans) as number[]
      const vlansToAdd = vlanIds.filter(v => !configuredVlans.includes(v))
      let updatedAt = sw.updated_at

      if (vlansToAdd.length > 0) {
        updatedAt = new Date().toISOString()
        await tx.switch.update({
          where: { id: switchId },
          data: {
            configured_vlans: JSON.stringify(normalizeConfiguredVlans([...configuredVlans, ...vlansToAdd])),
            updated_at: updatedAt
          }
        })
      }

      return { addedVlans: vlansToAdd, updatedAt }
    })
  },

  async applyConfiguredVlansRemoval(
    switchId: string,
    vlanId: number,
    options: {
      expectedUpdatedAt?: string
      portCleanup?: Array<{
        port_id: string
        field: 'access_vlan' | 'native_vlan' | 'tagged_vlans'
        new_value?: number | null
        action?: 'auto_remove'
      }>
    } = {}
  ): Promise<{ updatedAt: string; portsUpdated: number }> {
    return prisma.$transaction(async (tx) => {
      const sw = await tx.switch.findUnique({ where: { id: switchId }, include: includePorts })
      if (!sw) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })

      if (options.expectedUpdatedAt && sw.updated_at !== options.expectedUpdatedAt) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Switch was modified since page load',
          data: { current_updated_at: sw.updated_at }
        })
      }

      const configuredVlans = JSON.parse(sw.configured_vlans) as number[]
      if (!configuredVlans.includes(vlanId)) {
        throw createError({ statusCode: 422, statusMessage: `VLAN ${vlanId} is not in configured_vlans` })
      }

      let portsUpdated = 0
      const handledPortIds = new Set<string>()

      if (options.portCleanup) {
        for (const cleanup of options.portCleanup) {
          const port = sw.ports.find(p => p.id === cleanup.port_id)
          if (!port) continue
          if (cleanup.field === 'tagged_vlans') {
            const tagged = (JSON.parse(port.tagged_vlans) as number[]).filter(v => v !== vlanId)
            await tx.port.update({ where: { id: port.id }, data: { tagged_vlans: JSON.stringify(tagged) } })
          } else if (cleanup.field === 'access_vlan') {
            await tx.port.update({ where: { id: port.id }, data: { access_vlan: cleanup.new_value ?? null } })
          } else if (cleanup.field === 'native_vlan') {
            await tx.port.update({ where: { id: port.id }, data: { native_vlan: cleanup.new_value ?? null } })
          }
          portsUpdated++
          if (cleanup.field === 'tagged_vlans') handledPortIds.add(port.id)
        }
      }

      for (const port of sw.ports) {
        const tagged = JSON.parse(port.tagged_vlans) as number[]
        if (tagged.includes(vlanId) && !handledPortIds.has(port.id)) {
          await tx.port.update({
            where: { id: port.id },
            data: { tagged_vlans: JSON.stringify(tagged.filter(v => v !== vlanId)) }
          })
          portsUpdated++
        }
      }

      const updatedAt = new Date().toISOString()
      await tx.switch.update({
        where: { id: switchId },
        data: {
          configured_vlans: JSON.stringify(normalizeConfiguredVlans(configuredVlans.filter(v => v !== vlanId))),
          updated_at: updatedAt
        }
      })

      return { updatedAt, portsUpdated }
    })
  },

  async duplicate(id: string): Promise<Switch> {
    const original = await this.getById(id)
    if (!original) {
      throw createError({ statusCode: 404, message: 'Switch not found' })
    }

    const existing = await prisma.switch.findMany({ where: { site_id: original.site_id }, select: { name: true } })
    const existingNames = new Set(existing.map(s => s.name))
    let copyName = `${original.name} (Copy)`
    let counter = 1
    while (existingNames.has(copyName)) {
      counter++
      copyName = `${original.name} (Copy ${counter})`
    }

    const now = new Date().toISOString()
    const newSwitchId = randomUUID()
    const newSlug = await uniqueSwitchSlug(original.site_id, slugify(copyName))

    const result = await prisma.$transaction(async (tx) => {
      await tx.switch.create({
        data: {
          id: newSwitchId,
          site_id: original.site_id,
          slug: newSlug,
          name: copyName,
          model: original.model ?? null,
          manufacturer: original.manufacturer ?? null,
          serial_number: original.serial_number ?? null,
          location: original.location ?? null,
          rack_position: original.rack_position ?? null,
          management_ip: original.management_ip ?? null,
          firmware_version: original.firmware_version ?? null,
          layout_template_id: original.layout_template_id ?? null,
          stack_size: original.stack_size ?? null,
          role: original.role ?? null,
          tags: JSON.stringify(original.tags ?? []),
          configured_vlans: JSON.stringify(original.configured_vlans ?? []),
          is_favorite: false,
          sort_order: original.sort_order ?? null,
          notes: original.notes ?? null,
          created_at: now,
          updated_at: now
        }
      })

      if (original.ports.length > 0) {
        await tx.port.createMany({
          data: original.ports.map(p => ({
            switch_id: newSwitchId,
            ...portCreateInput({
              ...p,
              id: randomUUID(),
              connected_device: undefined,
              connected_device_id: undefined,
              connected_port_id: undefined,
              connected_port: undefined,
              connected_allocation_id: undefined
            })
          }))
        })
      }

      const row = await tx.switch.findUniqueOrThrow({ where: { id: newSwitchId }, include: includePorts })
      return rowToSwitch(row)
    })

    return result
  },

  async delete(idOrSlug: string, siteId?: string): Promise<boolean> {
    let sw = null
    if (siteId) {
      sw = await prisma.switch.findUnique({
        where: { site_id_slug: { site_id: siteId, slug: idOrSlug } },
        include: includePorts
      })
    }
    if (!sw) sw = await prisma.switch.findUnique({ where: { id: idOrSlug }, include: includePorts })
    if (!sw) {
      const matches = await prisma.switch.findMany({ where: { slug: idOrSlug }, include: includePorts })
      if (matches.length === 1) sw = matches[0]!
    }
    if (!sw) return false
    const id = sw.id

    await prisma.$transaction(async (tx) => {
      // Clear bidirectional links on remote ports before cascade deletes our ports.
      for (const port of sw.ports) {
        if (port.connected_device_id && port.connected_port_id) {
          await tx.port.update({
            where: { id: port.connected_port_id },
            data: {
              connected_device: null,
              connected_device_id: null,
              connected_port_id: null,
              connected_port: null
            }
          }).catch(() => { /* remote may not exist */ })
        }
      }

      // Clean up management IP allocation if any.
      if (sw.management_ip) {
        await syncManagementIpAllocation(tx, id, sw.name, undefined, sw.management_ip)
      }

      // Schema cascades to Port, LagGroup, PublicToken.
      await tx.switch.delete({ where: { id } })
    })

    return true
  }
}
