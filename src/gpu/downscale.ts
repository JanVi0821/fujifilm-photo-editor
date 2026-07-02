export const PREVIEW_MAX_LONG_EDGE = 1920

export function getPreviewSize(width: number, height: number, maxLongEdge = PREVIEW_MAX_LONG_EDGE) {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) {
    return { width, height, scale: 1 }
  }

  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}
