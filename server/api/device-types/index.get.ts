import { customDeviceTypeRepository } from '../../repositories/customDeviceTypeRepository'

// Readable by every authenticated user (viewer included); includes inactive
// types so settings can show the complete list.
export default defineEventHandler(async () => {
  return customDeviceTypeRepository.list()
})
