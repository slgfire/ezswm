import { layoutRepository } from '~/server/storage/repositories'
export default defineEventHandler(() => layoutRepository.getAll())
