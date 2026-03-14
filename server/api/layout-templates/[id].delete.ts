import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => ({ ok: await layoutRepository.delete(getRouterParam(event, 'id') || '') }))
