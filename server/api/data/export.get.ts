import { prisma } from '../../db/client'

// Inventory export (readable by viewers). Whole-DB JSON dump of inventory data; field
// shapes match the SQLite columns. Users (password hashes) and OIDC config are
// deliberately NOT included — use the admin-only /api/backup/export for full backups.
export default defineEventHandler(async (event) => {
  const [
    sites, switches, switchGroups, ports, vlans, networks, ipAllocations, ipRanges,
    layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
  ] = await Promise.all([
    prisma.site.findMany(),
    prisma.switch.findMany(),
    prisma.switchGroup.findMany(),
    prisma.port.findMany(),
    prisma.vlan.findMany(),
    prisma.network.findMany(),
    prisma.ipAllocation.findMany(),
    prisma.ipRange.findMany(),
    prisma.layoutTemplate.findMany(),
    prisma.lagGroup.findMany(),
    prisma.activityEntry.findMany({ orderBy: { timestamp: 'desc' } }),
    prisma.appSettings.findMany(),
    prisma.publicToken.findMany(),
    prisma.topologyLayout.findMany()
  ])

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-data-${new Date().toISOString().slice(0, 10)}.json"`)
  return {
    version: useRuntimeConfig().public.appVersion,
    created_at: new Date().toISOString(),
    schema: 'sqlite-v1',
    data: {
      sites, switches, switchGroups, ports, vlans, networks, ipAllocations, ipRanges,
      layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
    }
  }
})
