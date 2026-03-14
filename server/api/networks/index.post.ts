import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => networkRepository.create(await readBody(event)))
