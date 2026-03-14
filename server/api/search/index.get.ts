import { useStorage } from '~/server/storage'

export default defineEventHandler(async () => {
  const storage = useStorage()
  const [switches, networks, allocations, ranges] = await Promise.all([
    storage.switches.list(),
    storage.networks.list(),
    storage.ipAllocations.list(),
    storage.ipRanges.list()
  ])

  return {
    switches,
    networks,
    allocations,
    ranges
  }
})
