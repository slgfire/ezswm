import { repositories } from '~/server/repositories'

export default defineEventHandler(async () => repositories.settings.getSingleton())
