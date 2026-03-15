import type { H3Event } from 'h3'
import type { Network } from '~/shared/types/domain'
import { readCollection, writeCollection } from './base'

const fileName = 'networks.json'

export const networksRepository = {
  list(event?: H3Event) {
    return readCollection<Network>(event, fileName)
  },
  async getById(id: string, event?: H3Event) {
    const items = await this.list(event)
    return items.find(item => item.id === id)
  },
  updateAll(mutator: (items: Network[]) => Promise<Network[]> | Network[], event?: H3Event) {
    return (async () => {
      const items = await this.list(event)
      const updated = await mutator(items)
      await writeCollection(event, fileName, updated)
      return updated
    })()
  }
}
