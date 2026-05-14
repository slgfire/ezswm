type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export function roleColor(role: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    core: 'error',
    distribution: 'info',
    access: 'success',
    management: 'warning'
  }
  return map[role] || 'neutral'
}
