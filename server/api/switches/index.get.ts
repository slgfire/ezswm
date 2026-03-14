import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async () => switchRepository.list())
