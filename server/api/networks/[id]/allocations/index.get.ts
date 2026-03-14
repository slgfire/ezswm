import { networkRepository } from '../../../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => networkRepository.allocations(getRouterParam(event, 'id') || ''))
