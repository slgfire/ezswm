import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async () => networkRepository.list())
