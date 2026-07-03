import type { FilmEffects } from '../constants/adjustments'

const HALO_MAX_EDGE = 320
const HALATION_TINT: [number, number, number] = [1.0, 0.35, 0.12]

function clamp255(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : x
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

// Matches the GLSL hash used in the finish shader so CPU/GPU grain look alike.
function hash(x: number, y: number) {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// Build a blurred, thresholded highlight buffer (full-size RGBA) for halation.
// The heavy blur is offloaded to the browser's canvas filter for speed.
function computeHalo(input: ImageData, thresholdPct: number): Uint8ClampedArray | null {
  const { width, height } = input
  const longEdge = Math.max(width, height)
  const scale = longEdge > HALO_MAX_EDGE ? HALO_MAX_EDGE / longEdge : 1
  const sw = Math.max(1, Math.round(width * scale))
  const sh = Math.max(1, Math.round(height * scale))

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  const srcCtx = srcCanvas.getContext('2d')
  if (!srcCtx) return null
  srcCtx.putImageData(input, 0, 0)

  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = sw
  smallCanvas.height = sh
  const smallCtx = smallCanvas.getContext('2d')
  if (!smallCtx) return null
  smallCtx.drawImage(srcCanvas, 0, 0, sw, sh)

  const small = smallCtx.getImageData(0, 0, sw, sh)
  const hd = small.data
  const thr = thresholdPct / 100
  for (let i = 0; i < hd.length; i += 4) {
    const r = hd[i] / 255
    const g = hd[i + 1] / 255
    const b = hd[i + 2] / 255
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const m = smoothstep(thr, Math.min(thr + 0.2, 1), l)
    hd[i] = r * m * 255
    hd[i + 1] = g * m * 255
    hd[i + 2] = b * m * 255
    hd[i + 3] = 255
  }
  smallCtx.putImageData(small, 0, 0)

  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = sw
  blurCanvas.height = sh
  const blurCtx = blurCanvas.getContext('2d')
  if (!blurCtx) return null
  blurCtx.filter = 'blur(4px)'
  blurCtx.drawImage(smallCanvas, 0, 0)

  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = width
  fullCanvas.height = height
  const fullCtx = fullCanvas.getContext('2d')
  if (!fullCtx) return null
  fullCtx.imageSmoothingEnabled = true
  fullCtx.drawImage(blurCanvas, 0, 0, width, height)

  return fullCtx.getImageData(0, 0, width, height).data
}

export function applyFilmEffects(input: ImageData, film: FilmEffects): ImageData {
  const hasGrain = film.grain > 0
  const hasHalation = film.halation > 0
  if (!hasGrain && !hasHalation) return input

  const { width, height } = input
  const out = new ImageData(new Uint8ClampedArray(input.data), width, height)
  const d = out.data

  const halo = hasHalation ? computeHalo(input, film.halationThreshold) : null
  const halationAmt = (film.halation / 100) * 1.3
  const grainAmp = (film.grain / 100) * 0.14
  const grainSize = Math.max(1, film.grainSize)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      let r = d[i] / 255
      let g = d[i + 1] / 255
      let b = d[i + 2] / 255

      if (halo) {
        const h = Math.max(halo[i], halo[i + 1], halo[i + 2]) / 255
        const gr = clamp01(HALATION_TINT[0] * h * halationAmt)
        const gg = clamp01(HALATION_TINT[1] * h * halationAmt)
        const gb = clamp01(HALATION_TINT[2] * h * halationAmt)
        r = 1 - (1 - r) * (1 - gr)
        g = 1 - (1 - g) * (1 - gg)
        b = 1 - (1 - b) * (1 - gb)
      }

      if (hasGrain) {
        const n = hash(Math.floor(x / grainSize), Math.floor(y / grainSize)) - 0.5
        const l = 0.299 * r + 0.587 * g + 0.114 * b
        const lumaMod = 1 - Math.abs(l - 0.5) * 0.9
        const amp = n * grainAmp * (0.35 + 0.65 * lumaMod)
        r += amp
        g += amp
        b += amp
      }

      d[i] = clamp255(r * 255)
      d[i + 1] = clamp255(g * 255)
      d[i + 2] = clamp255(b * 255)
    }
  }

  return out
}
