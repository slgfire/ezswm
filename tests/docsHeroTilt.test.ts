import { canUseHeroTilt, getHeroTilt, setHeroTilt } from '../docs/.vitepress/theme/heroTilt'

describe('docs hero pointer tilt', () => {
  const bounds = { left: 20, top: 10, width: 100, height: 50 }

  it('keeps pointer tilt and parallax within bounds at and beyond image edges', () => {
    expect(getHeroTilt(-100, -100, bounds)).toEqual({ rotateX: 7, rotateY: -9, shiftX: -12, shiftY: -9 })
    expect(getHeroTilt(500, 500, bounds)).toEqual({ rotateX: -7, rotateY: 9, shiftX: 12, shiftY: 9 })
  })

  it('returns neutral rotation for the image center and unusable bounds', () => {
    const center = getHeroTilt(70, 35, bounds)
    expect(center.rotateX).toBeCloseTo(0)
    expect(center.rotateY).toBeCloseTo(0)
    expect(center.shiftX).toBeCloseTo(0)
    expect(center.shiftY).toBeCloseTo(0)
    expect(getHeroTilt(70, 35, { ...bounds, width: 0 })).toEqual({ rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 })
  })

  it('resets both CSS rotation values when the pointer leaves', () => {
    const values = new Map<string, string>()
    const style = { setProperty: (name: string, value: string) => values.set(name, value) }

    setHeroTilt(style, { rotateX: 7, rotateY: -9, shiftX: 12, shiftY: 9 })
    setHeroTilt(style, null)

    expect(values.get('--hero-pointer-x')).toBe('0deg')
    expect(values.get('--hero-pointer-y')).toBe('0deg')
    expect(values.get('--hero-pointer-shift-x')).toBe('0px')
    expect(values.get('--hero-pointer-shift-y')).toBe('0px')
  })

  it('disables pointer tilt when the pointer is coarse or motion is reduced', () => {
    expect(canUseHeroTilt(true, false)).toBe(true)
    expect(canUseHeroTilt(false, false)).toBe(false)
    expect(canUseHeroTilt(true, true)).toBe(false)
  })
})
