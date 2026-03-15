import { allocationsRepository } from '~/server/repositories/allocations.repository'
export default defineEventHandler((event) => allocationsRepository.list(event))
