import { prisma } from '../../db/client'

// Alias of /api/backup/export. Whole-DB JSON dump; field shapes match the
// SQLite columns.
export default defineEventHandler(async (event) => {
  const [
    sites, users, switches, ports, vlans, networks, ipAllocations, ipRanges,
    layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
  ] = await Promise.all([
    prisma.site.findMany(),
    prisma.user.findMany(),
    prisma.switch.findMany(),
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
      sites, users, switches, ports, vlans, networks, ipAllocations, ipRanges,
      layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
    }
  }
})
