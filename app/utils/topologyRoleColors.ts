export function topologyRoleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    core: '#ef4444', distribution: '#3b82f6', access: '#22c55e', management: '#eab308'
  }
  return map[role] || '#64748b'
}

export function topologyRoleBadgeBg(role: string): string {
  const map: Record<string, string> = {
    core: 'rgba(239,68,68,0.1)', distribution: 'rgba(59,130,246,0.1)',
    access: 'rgba(34,197,94,0.1)', management: 'rgba(234,179,8,0.1)'
  }
  return map[role] || 'rgba(100,116,139,0.1)'
}

export function topologyRoleBadgeBorder(role: string): string {
  const map: Record<string, string> = {
    core: 'rgba(239,68,68,0.2)', distribution: 'rgba(59,130,246,0.2)',
    access: 'rgba(34,197,94,0.2)', management: 'rgba(234,179,8,0.2)'
  }
  return map[role] || 'rgba(100,116,139,0.2)'
}

export function topologyRoleNodeBorder(role: string | undefined, hovered: boolean, fallbackBorder: string): string {
  if (!role) return fallbackBorder
  const base: Record<string, [number, number]> = {
    core: [0.3, 0.45],
    distribution: [0.25, 0.4],
    access: [0.15, 0.28],
    management: [0.15, 0.28]
  }
  const [normal, hover] = base[role] || [0.08, 0.15]
  const opacity = hovered ? hover : normal
  const color = topologyRoleBadgeColor(role)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function topologyRoleShortLabel(role: string): string {
  const map: Record<string, string> = {
    core: 'Core', distribution: 'Dist', access: 'Access', management: 'Mgmt'
  }
  return map[role] || role
}
