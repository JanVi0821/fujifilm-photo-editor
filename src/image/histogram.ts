const LUMA_R = 0.2126
const LUMA_G = 0.7152
const LUMA_B = 0.0722

export function computeLuminanceHistogramFromPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  bins = 256,
  sampleStep = 4,
): number[] {
  const histogram = new Array<number>(bins).fill(0)
  const pixelCount = width * height
  const stride = sampleStep

  for (let i = 0; i < pixelCount; i += stride) {
    const idx = i * 4
    const luma = Math.round(
      LUMA_R * pixels[idx] + LUMA_G * pixels[idx + 1] + LUMA_B * pixels[idx + 2],
    )
    const bin = luma < 0 ? 0 : luma > 255 ? 255 : luma
    histogram[bin] += 1
  }

  return histogram
}

export function computeLuminanceHistogram(
  imageData: ImageData,
  bins = 256,
  sampleStep = 4,
): number[] {
  const histogram = new Array<number>(bins).fill(0)
  const data = imageData.data
  const stride = 4 * sampleStep

  for (let i = 0; i < data.length; i += stride) {
    const luma = Math.round(LUMA_R * data[i] + LUMA_G * data[i + 1] + LUMA_B * data[i + 2])
    const bin = luma < 0 ? 0 : luma > 255 ? 255 : luma
    histogram[bin] += 1
  }

  return histogram
}

export function histogramToSvgPath(
  histogram: number[],
  width: number,
  height: number,
): string {
  if (histogram.length === 0) return ''

  const max = Math.max(...histogram, 1)
  const step = width / histogram.length
  const points: string[] = []

  for (let i = 0; i < histogram.length; i += 1) {
    const x = i * step
    const y = height - (histogram[i] / max) * height
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }

  return points.join(' ')
}
