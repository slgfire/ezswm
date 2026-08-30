import type { PrismaClient } from '@prisma/client'

type TxClient = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Clear reciprocal peer-link fields on ports that point to ports about to be deleted.
 */
export async function clearPeerLinksForDeletedPorts(tx: TxClient, deletingPortIds: string[]): Promise<void> {
  if (deletingPortIds.length === 0) return

  const peers = await tx.port.findMany({
    where: { connected_port_id: { in: deletingPortIds } },
    select: { id: true }
  })

  if (peers.length === 0) return

  await tx.port.updateMany({
    where: { id: { in: peers.map(peer => peer.id) }, connected_port_id: { in: deletingPortIds } },
    data: {
      connected_device: null,
      connected_device_id: null,
      connected_port: null,
      connected_port_id: null
    }
  })
}
