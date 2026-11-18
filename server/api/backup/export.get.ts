import { sendInventoryExport } from '../../utils/inventoryExport'

export default defineEventHandler(event => sendInventoryExport(event, 'backup'))
