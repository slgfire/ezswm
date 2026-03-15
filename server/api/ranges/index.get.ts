import { rangesRepository } from '~/server/repositories/ranges.repository'
export default defineEventHandler((event) => rangesRepository.list(event))
