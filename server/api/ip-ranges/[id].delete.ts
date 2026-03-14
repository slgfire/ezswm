import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => ({ ok: await networkRepository.deleteRange(getRouterParam(event, 'id') || '') }))
