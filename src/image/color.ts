export function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  if (max === min) return 0

  const d = max - min
  let h = 0

  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6
  } else {
    h = ((r - g) / d + 4) / 6
  }

  return h * 360
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toByte = (v: number) => Math.round(Math.max(0, Math.min(255, v * 255)))
    .toString(16)
    .padStart(2, '0')
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`
}

export function sampleCanvasPixel(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { r: number; g: number; b: number; hue: number; hex: string } | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx || canvas.width <= 0 || canvas.height <= 0) return null

  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width)
  const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height)
  const px = Math.max(0, Math.min(canvas.width - 1, x))
  const py = Math.max(0, Math.min(canvas.height - 1, y))

  const data = ctx.getImageData(px, py, 1, 1).data
  const r = data[0]! / 255
  const g = data[1]! / 255
  const b = data[2]! / 255

  return {
    r,
    g,
    b,
    hue: rgbToHue(r, g, b),
    hex: rgbToHex(r, g, b),
  }
}
