export interface HeroTilt {
  rotateX: number
  rotateY: number
  shiftX: number
  shiftY: number
}

type HeroBounds = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>
type HeroTiltStyle = Pick<CSSStyleDeclaration, 'setProperty'>

const MAX_TILT_X_DEGREES = 7
const MAX_TILT_Y_DEGREES = 9
const MAX_SHIFT_X_PX = 12
const MAX_SHIFT_Y_PX = 9
const HERO_IMAGE_SELECTOR = '.VPHero.has-image .image-container .image-src'
const HERO_CONTAINER_SELECTOR = '.VPHero.has-image .image-container'
const FINE_POINTER_QUERY = '(min-width: 960px) and (hover: hover) and (pointer: fine)'

export function canUseHeroTilt(finePointer: boolean, reducedMotion: boolean): boolean {
  return finePointer && !reducedMotion
}

export function getHeroTilt(clientX: number, clientY: number, bounds: HeroBounds): HeroTilt {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    !Number.isFinite(bounds.left) ||
    !Number.isFinite(bounds.top) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return { rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 }
  }

  const horizontal = Math.max(-1, Math.min(1, ((clientX - bounds.left) / bounds.width) * 2 - 1))
  const vertical = Math.max(-1, Math.min(1, ((clientY - bounds.top) / bounds.height) * 2 - 1))

  return {
    rotateX: -vertical * MAX_TILT_X_DEGREES,
    rotateY: horizontal * MAX_TILT_Y_DEGREES,
    shiftX: horizontal * MAX_SHIFT_X_PX,
    shiftY: vertical * MAX_SHIFT_Y_PX,
  }
}

export function setHeroTilt(style: HeroTiltStyle, tilt: HeroTilt | null): void {
  style.setProperty('--hero-pointer-x', `${tilt?.rotateX ?? 0}deg`)
  style.setProperty('--hero-pointer-y', `${tilt?.rotateY ?? 0}deg`)
  style.setProperty('--hero-pointer-shift-x', `${tilt?.shiftX ?? 0}px`)
  style.setProperty('--hero-pointer-shift-y', `${tilt?.shiftY ?? 0}px`)
}

export function installHeroPointerTilt() {
  const finePointer = window.matchMedia(FINE_POINTER_QUERY)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let activeImage: HTMLImageElement | null = null
  let pendingPointer: { image: HTMLImageElement; container: HTMLElement; x: number; y: number } | null = null
  let animationFrame = 0

  const reset = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
    pendingPointer = null

    if (activeImage) setHeroTilt(activeImage.style, null)
    activeImage = null
  }

  const findHeroImage = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLImageElement>(HERO_IMAGE_SELECTOR) : null

  const onPointerMove = (event: PointerEvent) => {
    const image = findHeroImage(event.target)
    if (
      !image ||
      event.pointerType !== 'mouse' ||
      !canUseHeroTilt(finePointer.matches, reducedMotion.matches)
    ) {
      reset()
      return
    }

    const container = image.closest<HTMLElement>(HERO_CONTAINER_SELECTOR)
    if (!container) {
      reset()
      return
    }

    if (activeImage && activeImage !== image) setHeroTilt(activeImage.style, null)
    activeImage = image
    pendingPointer = { image, container, x: event.clientX, y: event.clientY }

    if (animationFrame) return
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0
      const pointer = pendingPointer
      pendingPointer = null

      if (
        !pointer ||
        activeImage !== pointer.image ||
        !canUseHeroTilt(finePointer.matches, reducedMotion.matches)
      ) {
        reset()
        return
      }

      setHeroTilt(
        pointer.image.style,
        getHeroTilt(pointer.x, pointer.y, pointer.container.getBoundingClientRect()),
      )
    })
  }

  const onPointerOut = (event: PointerEvent) => {
    const image = findHeroImage(event.target)
    const nextTarget = event.relatedTarget
    if (!image || image !== activeImage) return
    if (!(nextTarget instanceof Node && image.contains(nextTarget))) reset()
  }

  const onPointerCancel = (event: PointerEvent) => {
    if (findHeroImage(event.target) === activeImage) reset()
  }

  const onEnvironmentChange = () => {
    if (!canUseHeroTilt(finePointer.matches, reducedMotion.matches)) reset()
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerout', onPointerOut)
  document.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('blur', reset)
  finePointer.addEventListener('change', onEnvironmentChange)
  reducedMotion.addEventListener('change', onEnvironmentChange)

  return {
    reset,
    destroy() {
      reset()
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerout', onPointerOut)
      document.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('blur', reset)
      finePointer.removeEventListener('change', onEnvironmentChange)
      reducedMotion.removeEventListener('change', onEnvironmentChange)
    },
  }
}
