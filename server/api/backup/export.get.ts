import { prisma } from '../../db/client'

// Whole-DB snapshot. Field shapes match the SQLite columns (JSON arrays/objects
// arrive as serialised strings — consumers parse them on the way back in).
export default defineEventHandler(async (event) => {
  const [
    users, switches, ports, vlans, networks, ipAllocations, ipRanges,
    layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
  ] = await Promise.all([
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

  const backup = {
    version: useRuntimeConfig().public.appVersion,
    created_at: new Date().toISOString(),
    schema: 'sqlite-v1',
    data: {
      users, switches, ports, vlans, networks, ipAllocations, ipRanges,
      layoutTemplates, lagGroups, activity, settings, publicTokens, topologyLayouts
    }
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="ezswm-backup-${new Date().toISOString().slice(0, 10)}.json"`)
  return backup
})
