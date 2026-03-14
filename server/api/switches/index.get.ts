import { switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(() => switchRepository.getAll())
