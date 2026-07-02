export const MAX_HSL_TARGETS = 8

export type HslTarget = {
  id: string
  centerHue: number
  pickedHex: string
  hueRange: number
  hue: number
  saturation: number
  luminance: number
}

export type HslSettings = {
  targets: HslTarget[]
  selectedId: string | null
}

export const DEFAULT_HSL_TARGET: Omit<HslTarget, 'id' | 'centerHue' | 'pickedHex'> = {
  hueRange: 18,
  hue: 0,
  saturation: 0,
  luminance: 0,
}

let hslTargetCounter = 0

export function createHslTarget(centerHue: number, pickedHex: string): HslTarget {
  hslTargetCounter += 1
  return {
    id: `hsl-${hslTargetCounter}-${Date.now()}`,
    centerHue,
    pickedHex,
    ...DEFAULT_HSL_TARGET,
  }
}

export function createDefaultHslSettings(): HslSettings {
  return {
    targets: [],
    selectedId: null,
  }
}

export function isDefaultHslSettings(hsl: HslSettings): boolean {
  if (hsl.targets.length === 0) return true
  return hsl.targets.every(
    (t) => t.hue === 0 && t.saturation === 0 && t.luminance === 0,
  )
}

export function addHslTarget(
  hsl: HslSettings,
  centerHue: number,
  pickedHex: string,
): HslSettings {
  if (hsl.targets.length >= MAX_HSL_TARGETS) return hsl

  const target = createHslTarget(centerHue, pickedHex)
  return {
    targets: [...hsl.targets, target],
    selectedId: target.id,
  }
}

export const HSL_ADJUSTMENT_RANGE = { min: -100, max: 100, step: 1 } as const
export const HSL_HUE_RANGE = { min: 5, max: 60, step: 1 } as const

export type PackedHslTargets = {
  count: number
  centerHue: number[]
  hueRange: number[]
  adjust: [number, number, number][]
}

export function packHslTargetsForGpu(targets: HslTarget[]): PackedHslTargets {
  const count = Math.min(targets.length, MAX_HSL_TARGETS)
  const centerHue = Array.from({ length: MAX_HSL_TARGETS }, () => 0)
  const hueRange = Array.from({ length: MAX_HSL_TARGETS }, () => 18)
  const adjust: [number, number, number][] = Array.from(
    { length: MAX_HSL_TARGETS },
    () => [0, 0, 0],
  )

  for (let i = 0; i < count; i += 1) {
    const t = targets[i]!
    centerHue[i] = t.centerHue
    hueRange[i] = t.hueRange
    adjust[i] = [t.hue, t.saturation, t.luminance]
  }

  return { count, centerHue, hueRange, adjust }
}
