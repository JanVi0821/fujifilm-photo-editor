import type { HslSettings } from '../constants/hsl'

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [h * 360, s, l]
}

function hueToRgb(p: number, q: number, t: number) {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360 / 360

  if (s === 0) {
    return [l, l, l]
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    hueToRgb(p, q, hh + 1 / 3),
    hueToRgb(p, q, hh),
    hueToRgb(p, q, hh - 1 / 3),
  ]
}

function colorWeight(pixelHue: number, centerHue: number, halfWidth: number): number {
  let dist = Math.abs(pixelHue - centerHue)
  if (dist > 180) dist = 360 - dist
  if (dist >= halfWidth) return 0

  const t = 1 - dist / halfWidth
  return t * t * (3 - 2 * t)
}

function applyHslShift(
  hue: number,
  sat: number,
  lum: number,
  hueShift: number,
  satAdj: number,
  lumAdj: number,
): [number, number, number] {
  let nextHue = hue
  let nextSat = sat
  let nextLum = lum

  if (sat > 0.04) {
    nextHue = (hue + (hueShift / 100) * 40 + 360) % 360
    nextSat = clamp01(sat * (1 + (satAdj / 100) * 1.2))
  }

  nextLum = clamp01(lum + (lumAdj / 100) * 0.35)

  return hslToRgb(nextHue, nextSat, nextLum)
}

function applyPixelHsl(
  r: number,
  g: number,
  b: number,
  hslSettings: HslSettings,
): [number, number, number] {
  const targets = hslSettings.targets
  if (targets.length === 0) return [r, g, b]

  const [hue, sat, lum] = rgbToHsl(r, g, b)

  let hueShift = 0
  let satAdj = 0
  let lumAdj = 0
  let weightSum = 0

  for (const target of targets) {
    const w = colorWeight(hue, target.centerHue, target.hueRange)
    if (w <= 0) continue

    hueShift += w * target.hue
    satAdj += w * target.saturation
    lumAdj += w * target.luminance
    weightSum += w
  }

  if (weightSum <= 0) return [r, g, b]

  hueShift /= weightSum
  satAdj /= weightSum
  lumAdj /= weightSum

  return applyHslShift(hue, sat, lum, hueShift, satAdj, lumAdj)
}

export function applyPixelHslAdjustments(
  r: number,
  g: number,
  b: number,
  hslSettings: HslSettings,
): [number, number, number] {
  return applyPixelHsl(r, g, b, hslSettings)
}
