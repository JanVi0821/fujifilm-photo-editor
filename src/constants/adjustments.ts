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

// Film-emulation "finishing" effects applied after the filter + color stages:
// grain (procedural noise) and halation (warm highlight bloom).
export type FilmEffects = {
  grain: number
  grainSize: number
  halation: number
  halationThreshold: number
}

export type ImageAdjustments = BasicAdjustments &
  LightingAdjustments & {
    hsl: HslSettings
    film: FilmEffects
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

export const DEFAULT_FILM_EFFECTS: FilmEffects = {
  grain: 0,
  grainSize: 2,
  halation: 0,
  halationThreshold: 65,
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  ...DEFAULT_BASIC_ADJUSTMENTS,
  ...DEFAULT_LIGHTING_ADJUSTMENTS,
  hsl: createDefaultHslSettings(),
  film: { ...DEFAULT_FILM_EFFECTS },
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

export const FILM_RANGES = {
  grain: { min: 0, max: 100, step: 1 },
  grainSize: { min: 1, max: 4, step: 0.5 },
  halation: { min: 0, max: 100, step: 1 },
  halationThreshold: { min: 0, max: 100, step: 1 },
} as const

export const NEUTRAL_TEMPERATURE_K = 5500

export function isDefaultFilm(film: FilmEffects): boolean {
  return (
    film.grain === DEFAULT_FILM_EFFECTS.grain &&
    film.grainSize === DEFAULT_FILM_EFFECTS.grainSize &&
    film.halation === DEFAULT_FILM_EFFECTS.halation &&
    film.halationThreshold === DEFAULT_FILM_EFFECTS.halationThreshold
  )
}

export function isDefaultAdjustments(adj: ImageAdjustments): boolean {
  const { hsl, film, ...rest } = adj
  const scalarDefaults = { ...DEFAULT_BASIC_ADJUSTMENTS, ...DEFAULT_LIGHTING_ADJUSTMENTS }

  const scalarsMatch = Object.entries(scalarDefaults).every(
    ([key, value]) => rest[key as keyof typeof scalarDefaults] === value,
  )

  return scalarsMatch && isDefaultHslSettings(hsl) && isDefaultFilm(film)
}
