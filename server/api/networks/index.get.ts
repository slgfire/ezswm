import { networkRepository } from '~/server/storage/repositories'
export default defineEventHandler(() => networkRepository.getAll())
