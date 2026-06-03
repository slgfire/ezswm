import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { LayoutTemplate, LayoutUnit } from '../../types/layoutTemplate'
import type { PortType } from '../../types/port'
import { incrementMemberLabel } from '../utils/deviceLibrary'

interface TemplateRow {
  id: string
  name: string
  manufacturer: string | null
  model: string | null
  description: string | null
  datasheet_url: string | null
  airflow: string | null
  units: string
  created_at: string
  updated_at: string
}

function rowToTemplate(row: TemplateRow): LayoutTemplate {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? undefined,
    description: row.description ?? undefined,
    datasheet_url: row.datasheet_url ?? undefined,
    airflow: (row.airflow as LayoutTemplate['airflow']) ?? undefined,
    units: JSON.parse(row.units) as LayoutUnit[],
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function generatePortLabel(blockLabel: string | undefined, unitNumber: number, portIndex: number): string {
  if (!blockLabel) return `${unitNumber}/${portIndex}`
  return blockLabel.match(/[/\-:.]$/) ? `${blockLabel}${portIndex}` : `${blockLabel} ${unitNumber}/${portIndex}`
}

interface ExpectedPort {
  unit: number
  index: number
  type: PortType
  label: string
}

function buildExpectedPorts(units: LayoutUnit[], stackSize: number): ExpectedPort[] {
  const expected: ExpectedPort[] = []
  for (let member = 1; member <= stackSize; member++) {
    const unitOffset = (member - 1) * units.length
    for (const unit of units) {
      for (const block of unit.blocks) {
        const memberLabel = block.label ? incrementMemberLabel(block.label, member) : block.label
        for (let i = 0; i < block.count; i++) {
          const portIndex = block.start_index + i
          const stackedUnit = unit.unit_number + unitOffset
          expected.push({
            unit: stackedUnit,
            index: portIndex,
            type: block.type,
            label: generatePortLabel(memberLabel, stackedUnit, portIndex)
          })
        }
      }
    }
  }
  return expected
}

function assignBlockIds(units: LayoutUnit[]): LayoutUnit[] {
  return units.map(unit => ({
    ...unit,
    blocks: unit.blocks.map(block => ({ ...block, id: block.id || randomUUID() }))
  }))
}

/**
 * For every switch using this template, reconcile its ports against the new
 * expected layout. Matched ports keep their settings; unmatched ports are
 * dropped; new positions become fresh ports. Cross-switch labels referring to
 * a renamed port get updated.
 */
async function syncPortsToTemplate(templateId: string, units: LayoutUnit[]): Promise<void> {
  const switches = await prisma.switch.findMany({
    where: { layout_template_id: templateId },
    include: { ports: { orderBy: [{ unit: 'asc' }, { index: 'asc' }] } }
  })

  for (const sw of switches) {
    const stackSize = sw.stack_size ?? 1
    const expectedPorts = buildExpectedPorts(units, stackSize)

    const consumed = new Set<string>()
    const labelUpdates: Array<{ portId: string; newLabel: string }> = []
    const newPortInserts: Array<ExpectedPort> = []
    let changed = false

    for (const ep of expectedPorts) {
      const existing = sw.ports.find(p =>
        !consumed.has(p.id)
        && p.unit === ep.unit
        && p.index === ep.index
        && p.type === ep.type
      )
      if (existing) {
        consumed.add(existing.id)
        if (existing.label !== ep.label) {
          labelUpdates.push({ portId: existing.id, newLabel: ep.label })
          changed = true
        }
      } else {
        newPortInserts.push(ep)
        changed = true
      }
    }

    const toDelete = sw.ports.filter(p => !consumed.has(p.id)).map(p => p.id)
    if (toDelete.length > 0) changed = true

    if (!changed) continue

    await prisma.$transaction(async (tx) => {
      // Drop unmatched ports.
      if (toDelete.length > 0) {
        await tx.port.deleteMany({ where: { id: { in: toDelete } } })
      }

      // Update labels on matched ports + cross-switch connected_port mirror.
      for (const upd of labelUpdates) {
        await tx.port.update({ where: { id: upd.portId }, data: { label: upd.newLabel } })
        await tx.port.updateMany({
          where: { connected_port_id: upd.portId, connected_device_id: sw.id },
          data: { connected_port: upd.newLabel }
        })
      }

      // Insert new ports.
      if (newPortInserts.length > 0) {
        await tx.port.createMany({
          data: newPortInserts.map(ep => ({
            id: randomUUID(),
            switch_id: sw.id,
            unit: ep.unit,
            index: ep.index,
            label: ep.label,
            type: ep.type,
            status: 'down',
            tagged_vlans: JSON.stringify([])
          }))
        })
      }

      await tx.switch.update({
        where: { id: sw.id },
        data: { updated_at: new Date().toISOString() }
      })
    })
  }
}

export const layoutTemplateRepository = {
  async list(): Promise<LayoutTemplate[]> {
    const rows = await prisma.layoutTemplate.findMany({ orderBy: { name: 'asc' } })
    return rows.map(rowToTemplate)
  },

  async getById(id: string): Promise<LayoutTemplate | null> {
    const row = await prisma.layoutTemplate.findUnique({ where: { id } })
    return row ? rowToTemplate(row) : null
  },

  async create(data: Omit<LayoutTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<LayoutTemplate> {
    const clash = await prisma.layoutTemplate.findFirst({ where: { name: data.name } })
    if (clash) {
      throw createError({ statusCode: 409, message: `Template name '${data.name}' already exists` })
    }

    const units = assignBlockIds(data.units)
    const now = new Date().toISOString()
    const row = await prisma.layoutTemplate.create({
      data: {
        id: randomUUID(),
        name: data.name,
        manufacturer: data.manufacturer ?? null,
        model: data.model ?? null,
        description: data.description ?? null,
        datasheet_url: data.datasheet_url ?? null,
        airflow: data.airflow ?? null,
        units: JSON.stringify(units),
        created_at: now,
        updated_at: now
      }
    })
    return rowToTemplate(row)
  },

  async update(id: string, data: Partial<Omit<LayoutTemplate, 'id' | 'created_at'>>): Promise<LayoutTemplate> {
    const current = await prisma.layoutTemplate.findUnique({ where: { id } })
    if (!current) {
      throw createError({ statusCode: 404, message: 'Layout template not found' })
    }

    if (data.name && data.name !== current.name) {
      const clash = await prisma.layoutTemplate.findFirst({ where: { name: data.name, NOT: { id } } })
      if (clash) {
        throw createError({ statusCode: 409, message: `Template name '${data.name}' already exists` })
      }
    }

    let unitsJson = current.units
    if (data.units) {
      const newUnits = assignBlockIds(data.units)
      unitsJson = JSON.stringify(newUnits)
    }

    const row = await prisma.layoutTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.manufacturer !== undefined ? { manufacturer: data.manufacturer ?? null } : {}),
        ...(data.model !== undefined ? { model: data.model ?? null } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.datasheet_url !== undefined ? { datasheet_url: data.datasheet_url ?? null } : {}),
        ...(data.airflow !== undefined ? { airflow: data.airflow ?? null } : {}),
        ...(data.units !== undefined ? { units: unitsJson } : {}),
        updated_at: new Date().toISOString()
      }
    })

    if (data.units) {
      await syncPortsToTemplate(id, JSON.parse(unitsJson) as LayoutUnit[])
    }

    return rowToTemplate(row)
  },

  async duplicate(id: string): Promise<LayoutTemplate> {
    const original = await this.getById(id)
    if (!original) {
      throw createError({ statusCode: 404, message: 'Layout template not found' })
    }

    const existingNames = (await prisma.layoutTemplate.findMany({ select: { name: true } }))
      .map(t => t.name)
    const existingSet = new Set(existingNames)
    let copyName = `${original.name} (Copy)`
    let counter = 1
    while (existingSet.has(copyName)) {
      counter++
      copyName = `${original.name} (Copy ${counter})`
    }

    const now = new Date().toISOString()
    const duplicateUnits = original.units.map(unit => ({
      ...unit,
      blocks: unit.blocks.map(block => ({ ...block, id: randomUUID() }))
    }))

    const row = await prisma.layoutTemplate.create({
      data: {
        id: randomUUID(),
        name: copyName,
        manufacturer: original.manufacturer ?? null,
        model: original.model ?? null,
        description: original.description ?? null,
        datasheet_url: original.datasheet_url ?? null,
        airflow: original.airflow ?? null,
        units: JSON.stringify(duplicateUnits),
        created_at: now,
        updated_at: now
      }
    })
    return rowToTemplate(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      // Schema sets Switch.layout_template_id to NULL on delete (onDelete: SetNull).
      await prisma.layoutTemplate.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }
}
