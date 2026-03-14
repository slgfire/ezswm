import { repositories } from '../../repositories'

export default defineEventHandler(() => repositories.networks.findAll())
