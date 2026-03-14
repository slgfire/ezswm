import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => layoutRepository.create(await readBody(event)))
