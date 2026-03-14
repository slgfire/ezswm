import { repositories } from '../../repositories'

export default defineEventHandler(() => repositories.layouts.findAll())
