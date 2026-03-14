import { repositories } from '../../repositories'

export default defineEventHandler(async () => repositories.settings.getSingleton())
