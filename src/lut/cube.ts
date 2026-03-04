export type CubeLUT = {
  size: number
  // data length = size^3 * 3, values in [0..1]
  data: Float32Array
}

// Very small .cube parser (3D LUT only). Supports comments and basic headers.
export function parseCube(text: string): CubeLUT {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  let size = 0
  const values: number[] = []

  for (const line of lines) {
    if (line.startsWith('#')) continue
    const upper = line.toUpperCase()

    if (upper.startsWith('LUT_3D_SIZE')) {
      const parts = line.split(/\s+/)
      size = Number(parts[1])
      continue
    }

    // ignore other headers like TITLE/DOMAIN_MIN/DOMAIN_MAX
    if (/^[A-Z_]+\s+/.test(upper) && line.split(/\s+/).length <= 4) {
      // Heuristic: header-ish line, skip.
      // (we still allow plain numeric triplets below)
      const maybeNums = line.split(/\s+/).slice(1).map(Number)
      if (maybeNums.some((n) => Number.isNaN(n))) continue
    }

    const parts = line.split(/\s+/)
    if (parts.length < 3) continue
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    if ([r, g, b].some((n) => Number.isNaN(n))) continue

    values.push(r, g, b)
  }

  if (!size) throw new Error('Invalid .cube: missing LUT_3D_SIZE')

  const expected = size * size * size * 3
  if (values.length < expected) {
    throw new Error(`Invalid .cube: expected ${expected} values, got ${values.length}`)
  }

  return {
    size,
    data: new Float32Array(values.slice(0, expected)),
  }
}

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

// .cube standard convention: R changes fastest, then G, then B.
// Index = ((b * size + g) * size + r) * 3
function get(lut: CubeLUT, r: number, g: number, b: number) {
  const s = lut.size
  const idx = ((b * s + g) * s + r) * 3
  const d = lut.data
  return [d[idx], d[idx + 1], d[idx + 2]] as const
}

// Trilinear interpolation in RGB cube.
export function sampleLUT(lut: CubeLUT, r01: number, g01: number, b01: number) {
  const s = lut.size
  const max = s - 1

  const rr = clamp01(r01) * max
  const gg = clamp01(g01) * max
  const bb = clamp01(b01) * max

  const r0 = Math.floor(rr)
  const g0 = Math.floor(gg)
  const b0 = Math.floor(bb)

  const r1 = Math.min(r0 + 1, max)
  const g1 = Math.min(g0 + 1, max)
  const b1 = Math.min(b0 + 1, max)

  const tr = rr - r0
  const tg = gg - g0
  const tb = bb - b0

  const c000 = get(lut, r0, g0, b0)
  const c001 = get(lut, r0, g0, b1)
  const c010 = get(lut, r0, g1, b0)
  const c011 = get(lut, r0, g1, b1)
  const c100 = get(lut, r1, g0, b0)
  const c101 = get(lut, r1, g0, b1)
  const c110 = get(lut, r1, g1, b0)
  const c111 = get(lut, r1, g1, b1)

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const c00 = [
    lerp(c000[0], c001[0], tb),
    lerp(c000[1], c001[1], tb),
    lerp(c000[2], c001[2], tb),
  ]
  const c01 = [
    lerp(c010[0], c011[0], tb),
    lerp(c010[1], c011[1], tb),
    lerp(c010[2], c011[2], tb),
  ]
  const c10 = [
    lerp(c100[0], c101[0], tb),
    lerp(c100[1], c101[1], tb),
    lerp(c100[2], c101[2], tb),
  ]
  const c11 = [
    lerp(c110[0], c111[0], tb),
    lerp(c110[1], c111[1], tb),
    lerp(c110[2], c111[2], tb),
  ]

  const c0 = [lerp(c00[0], c01[0], tg), lerp(c00[1], c01[1], tg), lerp(c00[2], c01[2], tg)]
  const c1 = [lerp(c10[0], c11[0], tg), lerp(c10[1], c11[1], tg), lerp(c10[2], c11[2], tg)]

  return [lerp(c0[0], c1[0], tr), lerp(c0[1], c1[1], tr), lerp(c0[2], c1[2], tr)] as const
}
