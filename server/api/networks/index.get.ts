import { repositories } from '~/server/repositories'

export default defineEventHandler(() => repositories.networks.findAll())
