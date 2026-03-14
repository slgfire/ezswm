import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async () => layoutRepository.list())
