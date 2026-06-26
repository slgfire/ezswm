import { buildLayoutTemplatePoeOptions, normalizeLayoutTemplatePoeSelection, poeNoneValue } from '../app/utils/layoutTemplatePoe'

describe('layout template poe helpers', () => {
  it('includes a None option for blank selection', () => {
    const options = buildLayoutTemplatePoeOptions((key) => key)

    expect(options[0]).toEqual({ label: 'templates.poeNone', value: poeNoneValue })
  })

  it('maps None sentinel back to empty value on save', () => {
    expect(normalizeLayoutTemplatePoeSelection(poeNoneValue)).toBeUndefined()
    expect(normalizeLayoutTemplatePoeSelection('802.3at')).toBe('802.3at')
  })
})
