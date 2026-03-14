import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => ({ ok: await switchRepository.delete(getRouterParam(event, 'id') || '') }))
