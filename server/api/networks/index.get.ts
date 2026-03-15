import { networksRepository } from '~/server/repositories/networks.repository'
export default defineEventHandler((event) => networksRepository.list(event))
