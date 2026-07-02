export const PREVIEW_MAX_LONG_EDGE = 1920

// Upper bound for the full-resolution working size. The effective cap is the
// smaller of this and the GPU's MAX_TEXTURE_SIZE, which keeps memory in check
// and avoids exceeding mobile texture limits.
export const FULL_MAX_LONG_EDGE = 4096

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
