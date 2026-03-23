import { vlanRepository } from '../../repositories/vlanRepository'

export default defineEventHandler(() => {
  const color = vlanRepository.getNextAvailableColor()
  return { color: color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') }
})
