import type { H3Event } from 'h3'
import type { PrismaClient, TopologyLayout } from '@prisma/client'
import { exportRows, exportRowsBy, jsonExportArray, sendSnapshotExport } from './snapshotExport'

function inventoryTables(db: PrismaClient) {
  return {
    sites: exportRows(page => db.site.findMany({ ...page, orderBy: { id: 'asc' } })),
    switches: exportRows(page => db.switch.findMany({ ...page, orderBy: { id: 'asc' } })),
    switchGroups: exportRows(page => db.switchGroup.findMany({ ...page, orderBy: { id: 'asc' } })),
    ports: exportRows(page => db.port.findMany({ ...page, orderBy: { id: 'asc' } })),
    vlans: exportRows(page => db.vlan.findMany({ ...page, orderBy: { id: 'asc' } })),
    networks: exportRows(page => db.network.findMany({ ...page, orderBy: { id: 'asc' } })),
    ipAllocations: exportRows(page => db.ipAllocation.findMany({ ...page, orderBy: { id: 'asc' } })),
    ipRanges: exportRows(page => db.ipRange.findMany({ ...page, orderBy: { id: 'asc' } })),
    layoutTemplates: exportRows(page => db.layoutTemplate.findMany({ ...page, orderBy: { id: 'asc' } })),
    lagGroups: exportRows(page => db.lagGroup.findMany({ ...page, orderBy: { id: 'asc' } })),
    activity: exportRows(page => db.activityEntry.findMany({ ...page, orderBy: [{ timestamp: 'desc' }, { id: 'asc' }] })),
    settings: exportRows(page => db.appSettings.findMany({ ...page, orderBy: { id: 'asc' } })),
    publicTokens: exportRows(page => db.publicToken.findMany({ ...page, orderBy: { id: 'asc' } })),
    topologyLayouts: exportRowsBy<TopologyLayout, { site_id: string }>(
      page => db.topologyLayout.findMany({ ...page, orderBy: { site_id: 'asc' } }),
      row => ({ site_id: row.site_id })
    ),
    customDeviceTypes: exportRows(page => db.customDeviceType.findMany({ ...page, orderBy: [{ name: 'asc' }, { id: 'asc' }] })),
  }
}

function backupOnlyTables(db: PrismaClient) {
  return {
    users: exportRows(page => db.user.findMany({ ...page, orderBy: { id: 'asc' } })),
    oidcConfig: exportRows(page => db.oidcConfig.findMany({ ...page, orderBy: { id: 'asc' } })),
    patchPanels: exportRows(page => db.patchPanel.findMany({ ...page, orderBy: { id: 'asc' } })),
    patchPanelSockets: exportRows(page => db.patchPanelSocket.findMany({ ...page, orderBy: { id: 'asc' } })),
    patchPanelTokens: exportRows(page => db.patchPanelToken.findMany({ ...page, orderBy: { id: 'asc' } })),
  }
}

export function sendInventoryExport(event: H3Event, kind: 'data' | 'backup'): Promise<unknown> {
  const createdAt = new Date().toISOString()
  const metadata = {
    version: useRuntimeConfig().public.appVersion,
    created_at: createdAt,
    schema: 'sqlite-v1'
  }
  return sendSnapshotExport(event, 'application/json', `ezswm-${kind}-${createdAt.slice(0, 10)}.json`, async function* (db) {
    const tables = { ...inventoryTables(db), ...(kind === 'backup' ? backupOnlyTables(db) : {}) }
    yield JSON.stringify(metadata).slice(0, -1) + ',"data":{'
    let first = true
    for (const [name, rows] of Object.entries(tables)) {
      yield (first ? '' : ',') + JSON.stringify(name) + ':'
      yield* jsonExportArray(rows)
      first = false
    }
    yield '}}'
  })
}
