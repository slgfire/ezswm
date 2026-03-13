import { useStorage } from '~/server/storage'

export default defineEventHandler(async () => {
  const storage = useStorage()
  const [networks, allocations] = await Promise.all([
    storage.networks.list(),
    storage.ipAllocations.list()
  ])

  return networks.map((network) => ({
    ...network,
    allocations: allocations.filter((entry) => entry.networkId === network.id)
  }))
})
