export const poeNoneValue = '__none__'

const poeOptionValues = [
  { label: '802.3af (15.4W)', value: '802.3af' },
  { label: '802.3at (30W)', value: '802.3at' },
  { label: '802.3bt Type 3 (60W)', value: '802.3bt-type3' },
  { label: '802.3bt Type 4 (100W)', value: '802.3bt-type4' },
  { label: 'Passive 24V', value: 'passive-24v' },
  { label: 'Passive 48V', value: 'passive-48v' },
] as const

export function buildLayoutTemplatePoeOptions(t: (key: string) => string) {
  return [
    { label: t('templates.poeNone'), value: poeNoneValue },
    ...poeOptionValues
  ]
}

export function normalizeLayoutTemplatePoeSelection(value?: string | null): string | undefined {
  if (!value || value === poeNoneValue) return undefined
  return value
}

export function layoutTemplatePoeSelection(value?: { type?: string } | null): string {
  return value?.type || poeNoneValue
}
