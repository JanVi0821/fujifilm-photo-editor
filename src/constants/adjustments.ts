import { createDefaultHslSettings, isDefaultHslSettings } from './hsl'
import type { HslSettings } from './hsl'

export type BasicAdjustments = {
  exposure: number
  contrast: number
  saturation: number
  temperature: number
  tint: number
}

export type LightingAdjustments = {
  highlights: number
  shadows: number
  whites: number
  blacks: number
}

export type ImageAdjustments = BasicAdjustments &
  LightingAdjustments & {
    hsl: HslSettings
  }

export const DEFAULT_BASIC_ADJUSTMENTS: BasicAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 5500,
  tint: 0,
}

export const DEFAULT_LIGHTING_ADJUSTMENTS: LightingAdjustments = {
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  ...DEFAULT_BASIC_ADJUSTMENTS,
  ...DEFAULT_LIGHTING_ADJUSTMENTS,
  hsl: createDefaultHslSettings(),
}

export const ADJUSTMENT_RANGES = {
  exposure: { min: -2, max: 2, step: 0.05 },
  contrast: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  temperature: { min: 2000, max: 10000, step: 100 },
  tint: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: -100, max: 100, step: 1 },
  blacks: { min: -100, max: 100, step: 1 },
} as const

export const NEUTRAL_TEMPERATURE_K = 5500

export function isDefaultAdjustments(adj: ImageAdjustments): boolean {
  const { hsl, ...rest } = adj
  const scalarDefaults = { ...DEFAULT_BASIC_ADJUSTMENTS, ...DEFAULT_LIGHTING_ADJUSTMENTS }

  const scalarsMatch = Object.entries(scalarDefaults).every(
    ([key, value]) => rest[key as keyof typeof scalarDefaults] === value,
  )

  return scalarsMatch && isDefaultHslSettings(hsl)
}
