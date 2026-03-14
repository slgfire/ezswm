import { repositories } from '../../repositories'

export default defineEventHandler(() => repositories.switches.findAll())
