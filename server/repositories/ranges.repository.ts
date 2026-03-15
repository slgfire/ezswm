import type { H3Event } from 'h3'
import type { IpRange } from '~/shared/types/domain'
import { readCollection, writeCollection } from './base'

const fileName = 'ranges.json'

export const rangesRepository = {
  list(event?: H3Event) {
    return readCollection<IpRange>(event, fileName)
  },
  updateAll(mutator: (items: IpRange[]) => Promise<IpRange[]> | IpRange[], event?: H3Event) {
    return (async () => {
      const items = await this.list(event)
      const updated = await mutator(items)
      await writeCollection(event, fileName, updated)
      return updated
    })()
  }
}
