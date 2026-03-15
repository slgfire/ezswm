import { switchesRepository } from '~/server/repositories/switches.repository'
export default defineEventHandler((event) => switchesRepository.list(event))
