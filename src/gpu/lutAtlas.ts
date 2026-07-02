import type { CubeLUT } from '../lut/cube'

export function cubeToLutAtlas(lut: CubeLUT): { data: Uint8Array; size: number; width: number; height: number } {
  const size = lut.size
  const width = size * size
  const height = size
  const data = new Uint8Array(width * height * 4)

  for (let b = 0; b < size; b += 1) {
    for (let g = 0; g < size; g += 1) {
      for (let r = 0; r < size; r += 1) {
        const lutIdx = ((b * size + g) * size + r) * 3
        const atlasX = b * size + r
        const atlasY = g
        const atlasIdx = (atlasY * width + atlasX) * 4

        data[atlasIdx] = Math.round(lut.data[lutIdx] * 255)
        data[atlasIdx + 1] = Math.round(lut.data[lutIdx + 1] * 255)
        data[atlasIdx + 2] = Math.round(lut.data[lutIdx + 2] * 255)
        data[atlasIdx + 3] = 255
      }
    }
  }

  return { data, size, width, height }
}
