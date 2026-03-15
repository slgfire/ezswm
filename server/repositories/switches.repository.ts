import type { H3Event } from 'h3'
import type { SwitchDevice } from '~/shared/types/domain'
import { readCollection, writeCollection } from './base'

const fileName = 'switches.json'

export const switchesRepository = {
  list(event?: H3Event) {
    return readCollection<SwitchDevice>(event, fileName)
  },
  async getById(id: string, event?: H3Event) {
    const items = await this.list(event)
    return items.find(item => item.id === id)
  },
  create(payload: SwitchDevice, event?: H3Event) {
    return this.updateAll(async items => {
      items.push(payload)
      return items
    }, event)
  },
  updateAll(mutator: (items: SwitchDevice[]) => Promise<SwitchDevice[]> | SwitchDevice[], event?: H3Event) {
    return (async () => {
      const items = await this.list(event)
      const updated = await mutator(items)
      await writeCollection(event, fileName, updated)
      return updated
    })()
  }
}
