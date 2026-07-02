import type { ImageAdjustments } from '../constants/adjustments'
import { NEUTRAL_TEMPERATURE_K } from '../constants/adjustments'
import { applyPixelHslAdjustments } from './hsl'

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function clamp255(x: number) {
  return Math.round(x < 0 ? 0 : x > 255 ? 255 : x)
}

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function applyExposure(r: number, g: number, b: number, ev: number) {
  const factor = 2 ** ev
  return [r * factor, g * factor, b * factor] as const
}

function applyContrast(r: number, g: number, b: number, contrast: number) {
  const factor = (100 + contrast) / 100
  return [
    (r - 0.5) * factor + 0.5,
    (g - 0.5) * factor + 0.5,
    (b - 0.5) * factor + 0.5,
  ] as const
}

function applySaturation(r: number, g: number, b: number, saturation: number) {
  const factor = (100 + saturation) / 100
  const y = luma(r, g, b)
  return [y + (r - y) * factor, y + (g - y) * factor, y + (b - y) * factor] as const
}

function applyTemperatureTint(
  r: number,
  g: number,
  b: number,
  kelvin: number,
  tint: number,
) {
  const tempDelta = (kelvin - NEUTRAL_TEMPERATURE_K) / NEUTRAL_TEMPERATURE_K
  const rMul = 1 + tempDelta * 0.35
  const bMul = 1 - tempDelta * 0.35
  const tintFactor = tint / 100
  const gMul = 1 - tintFactor * 0.25

  return [r * rMul, g * gMul, b * bMul] as const
}

function applyLighting(
  r: number,
  g: number,
  b: number,
  highlights: number,
  shadows: number,
  whites: number,
  blacks: number,
) {
  const y = luma(r, g, b)
  const highlightMask = smoothstep(0.45, 0.95, y)
  const shadowMask = 1 - smoothstep(0.05, 0.55, y)
  const whiteMask = smoothstep(0.75, 1.0, y)
  const blackMask = 1 - smoothstep(0.0, 0.25, y)

  const highlightShift = (highlights / 100) * 0.35 * highlightMask
  const shadowShift = (shadows / 100) * 0.35 * shadowMask
  const whiteShift = (whites / 100) * 0.25 * whiteMask
  const blackShift = (blacks / 100) * 0.25 * blackMask

  return [
    clamp01(r + highlightShift + shadowShift + whiteShift + blackShift),
    clamp01(g + highlightShift + shadowShift + whiteShift + blackShift),
    clamp01(b + highlightShift + shadowShift + whiteShift + blackShift),
  ] as const
}

export function applyImageAdjustments(
  imageData: ImageData,
  adjustments: ImageAdjustments,
): ImageData {
  const result = new ImageData(imageData.width, imageData.height)
  const src = imageData.data
  const dst = result.data

  for (let i = 0; i < src.length; i += 4) {
    let r = src[i] / 255
    let g = src[i + 1] / 255
    let b = src[i + 2] / 255

    ;[r, g, b] = applyExposure(r, g, b, adjustments.exposure)
    ;[r, g, b] = applyContrast(r, g, b, adjustments.contrast)
    ;[r, g, b] = applySaturation(r, g, b, adjustments.saturation)
    ;[r, g, b] = applyTemperatureTint(r, g, b, adjustments.temperature, adjustments.tint)
    ;[r, g, b] = applyLighting(
      r,
      g,
      b,
      adjustments.highlights,
      adjustments.shadows,
      adjustments.whites,
      adjustments.blacks,
    )
    ;[r, g, b] = applyPixelHslAdjustments(r, g, b, adjustments.hsl)

    dst[i] = clamp255(r * 255)
    dst[i + 1] = clamp255(g * 255)
    dst[i + 2] = clamp255(b * 255)
    dst[i + 3] = src[i + 3]
  }

  return result
}

export function blendPixels(
  original: ImageData,
  filtered: ImageData,
  strength: number,
): ImageData {
  const t = strength / 100
  const result = new ImageData(original.width, original.height)
  const od = original.data
  const fd = filtered.data
  const rd = result.data

  for (let i = 0; i < rd.length; i += 4) {
    rd[i] = Math.round(od[i] * (1 - t) + fd[i] * t)
    rd[i + 1] = Math.round(od[i + 1] * (1 - t) + fd[i + 1] * t)
    rd[i + 2] = Math.round(od[i + 2] * (1 - t) + fd[i + 2] * t)
    rd[i + 3] = od[i + 3]
  }

  return result
}

export function copyImageData(imageData: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  )
}

export { clamp01 }
