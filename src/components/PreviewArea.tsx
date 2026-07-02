import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import { rgbToHex } from '../image/color'

type PreviewAreaProps = {
  imageUrl: string | null
  imgRef: RefObject<HTMLImageElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  isProcessing: boolean
  eyedropperActive: boolean
  onImageLoad: () => void
  onEyedropperPick: (clientX: number, clientY: number) => void
}

const LOUPE_SIZE = 120
const MIN_ZOOM = 4
const MAX_ZOOM = 20
const DEFAULT_ZOOM = 8

type LoupeState = { x: number; y: number; hex: string }

export function PreviewArea({
  imageUrl,
  imgRef,
  canvasRef,
  isProcessing,
  eyedropperActive,
  onImageLoad,
  onEyedropperPick,
}: PreviewAreaProps) {
  const [showBefore, setShowBefore] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [loupe, setLoupe] = useState<LoupeState | null>(null)
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  const handleCompareDown = () => setShowBefore(true)
  const handleCompareUp = () => setShowBefore(false)

  const updateLoupe = useCallback(
    (clientX: number, clientY: number, z: number) => {
      const canvas = canvasRef.current
      const loupeCanvas = loupeCanvasRef.current
      if (!canvas || !loupeCanvas) return

      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const fx = (clientX - rect.left) / rect.width
      const fy = (clientY - rect.top) / rect.height
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) {
        pointerRef.current = null
        setLoupe(null)
        return
      }

      const px = Math.max(0, Math.min(canvas.width - 1, Math.floor(fx * canvas.width)))
      const py = Math.max(0, Math.min(canvas.height - 1, Math.floor(fy * canvas.height)))

      const sctx = canvas.getContext('2d', { willReadFrequently: true })
      const lctx = loupeCanvas.getContext('2d')
      if (!sctx || !lctx) return

      const data = sctx.getImageData(px, py, 1, 1).data
      const hex = rgbToHex(data[0]! / 255, data[1]! / 255, data[2]! / 255)

      const srcSize = LOUPE_SIZE / z
      const half = srcSize / 2

      lctx.imageSmoothingEnabled = false
      lctx.fillStyle = '#000'
      lctx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
      lctx.drawImage(
        canvas,
        px + 0.5 - half,
        py + 0.5 - half,
        srcSize,
        srcSize,
        0,
        0,
        LOUPE_SIZE,
        LOUPE_SIZE,
      )

      // Highlight the exact pixel being sampled at the loupe center.
      const boxSize = LOUPE_SIZE / srcSize
      const boxPos = (LOUPE_SIZE - boxSize) / 2
      lctx.strokeStyle = 'rgba(0,0,0,0.6)'
      lctx.lineWidth = 1
      lctx.strokeRect(boxPos - 0.5, boxPos - 0.5, boxSize + 1, boxSize + 1)
      lctx.strokeStyle = 'rgba(255,255,255,0.95)'
      lctx.strokeRect(boxPos + 0.5, boxPos + 0.5, boxSize - 1, boxSize - 1)

      pointerRef.current = { x: clientX, y: clientY }
      setLoupe({ x: clientX, y: clientY, hex })
    },
    [canvasRef],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive || showBefore) return
    // Capture the pointer so we keep receiving move/up even if it leaves the canvas.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    updateLoupe(e.clientX, e.clientY, zoom)
  }

  const handlePointerSample = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive || showBefore) return
    updateLoupe(e.clientX, e.clientY, zoom)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive || showBefore) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    // Pick the last valid sampled position (what the loupe was showing on release).
    const pos = pointerRef.current
    if (pos) {
      onEyedropperPick(pos.x, pos.y)
    }
    pointerRef.current = null
    setLoupe(null)
  }

  const hideLoupe = () => {
    pointerRef.current = null
    setLoupe(null)
  }

  const changeZoom = (delta: number) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
    if (next === zoom) return
    setZoom(next)
    if (pointerRef.current) {
      updateLoupe(pointerRef.current.x, pointerRef.current.y, next)
    }
  }

  useEffect(() => {
    const img = imgRef.current
    if (!imageUrl || !img) return
    if (img.complete && img.naturalWidth > 0) {
      onImageLoad()
    }
  }, [imageUrl, imgRef, onImageLoad])

  // Wheel-to-zoom over the image while sampling (desktop convenience).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !eyedropperActive) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      changeZoom(e.deltaY < 0 ? 1 : -1)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  })

  const canvasCls =
    'block h-auto max-h-full w-auto max-w-full object-contain bg-black' +
    (eyedropperActive ? ' cursor-crosshair touch-none' : '')

  return (
    <main className="sticky top-0 z-20 order-1 flex h-[45vh] min-h-0 w-full min-w-0 shrink-0 select-none items-center justify-center overflow-auto border-b border-border bg-app p-4 [-webkit-touch-callout:none] md:static md:z-auto md:order-0 md:h-auto md:flex-1 md:shrink md:border-b-0 md:p-6">
      <div className="relative flex max-h-full max-w-full items-center justify-center">
        {imageUrl && (
          <div className="relative max-h-full max-w-full leading-none">
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              aria-hidden={!showBefore}
              className="block h-auto max-h-full w-auto max-w-full object-contain"
              style={{ display: showBefore ? 'block' : 'none' }}
              onLoad={onImageLoad}
            />
            <canvas
              ref={canvasRef}
              className={canvasCls}
              style={{ display: showBefore ? 'none' : 'block' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerSample}
              onPointerUp={handlePointerUp}
              onPointerCancel={hideLoupe}
              onPointerLeave={hideLoupe}
            />
          </div>
        )}

        {isProcessing && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-[2px] bg-black/75 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg backdrop-blur-xs">
            Processing…
          </div>
        )}

        {eyedropperActive && !showBefore && (
          <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded bg-black/80 px-2 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm">
            <span className="text-white/50">ZOOM</span>
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center rounded bg-white/10 leading-none hover:bg-white/25"
              onClick={() => changeZoom(-2)}
              aria-label="Decrease zoom"
            >
              −
            </button>
            <span className="w-6 text-center">{zoom}×</span>
            <button
              type="button"
              className="flex h-4 w-4 items-center justify-center rounded bg-white/10 leading-none hover:bg-white/25"
              onClick={() => changeZoom(2)}
              aria-label="Increase zoom"
            >
              +
            </button>
          </div>
        )}

        {eyedropperActive && !showBefore && (
          <div
            className="pointer-events-none fixed z-50 flex flex-col items-center gap-1"
            style={{
              left: loupe?.x ?? 0,
              top: (loupe?.y ?? 0) - 20,
              transform: 'translate(-50%, -100%)',
              visibility: loupe ? 'visible' : 'hidden',
            }}
          >
            <div
              className="overflow-hidden rounded-full border-2 border-white/85 shadow-[0_2px_12px_rgba(0,0,0,0.55)]"
              style={{ width: LOUPE_SIZE, height: LOUPE_SIZE }}
            >
              <canvas
                ref={loupeCanvasRef}
                width={LOUPE_SIZE}
                height={LOUPE_SIZE}
                className="block h-full w-full"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded bg-black/85 px-2 py-1 text-[11px] font-semibold tracking-wide text-white">
              <span
                className="h-3 w-3 rounded-sm border border-white/30"
                style={{ backgroundColor: loupe?.hex ?? '#000' }}
              />
              <span>{loupe?.hex.toUpperCase()}</span>
              <span className="text-white/50">{zoom}×</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded border border-border bg-[rgba(10,10,10,0.85)] px-4 py-2 backdrop-blur-sm">
          <button
            className={`flex cursor-pointer select-none items-center gap-1.5 border-0 bg-transparent p-0 text-[10px] tracking-[0.06em] transition-colors ${
              showBefore ? 'text-fg' : 'text-fg-secondary hover:text-fg'
            }`}
            onMouseDown={handleCompareDown}
            onMouseUp={handleCompareUp}
            onMouseLeave={handleCompareUp}
            onTouchStart={handleCompareDown}
            onTouchEnd={handleCompareUp}
            title="Hold to compare before / after"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M3 9h6M3 15h6" />
            </svg>
            Before / After
          </button>
        </div>
      </div>
    </main>
  )
}
