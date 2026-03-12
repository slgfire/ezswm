import type { Switch } from '~/types/models'
import type { PortRepository } from '~/server/storage/interfaces/repositories'
import type { SwitchRepository } from '~/server/storage/interfaces/repositories'

export class JsonPortRepository implements PortRepository {
  constructor(private readonly switchRepository: SwitchRepository) {}

  async updateBySwitchAndNumber(switchId: string, portNumber: number, payload: Partial<Switch['ports'][number]>): Promise<Switch['ports'][number] | undefined> {
    return this.switchRepository.updatePort(switchId, portNumber, payload)
  }
}
