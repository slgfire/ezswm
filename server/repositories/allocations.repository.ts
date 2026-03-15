import type { H3Event } from 'h3'
import type { IpAllocation } from '~/shared/types/domain'
import { readCollection, writeCollection } from './base'

const fileName = 'allocations.json'

export const allocationsRepository = {
  list(event?: H3Event) {
    return readCollection<IpAllocation>(event, fileName)
  },
  updateAll(mutator: (items: IpAllocation[]) => Promise<IpAllocation[]> | IpAllocation[], event?: H3Event) {
    return (async () => {
      const items = await this.list(event)
      const updated = await mutator(items)
      await writeCollection(event, fileName, updated)
      return updated
    })()
  }
}
