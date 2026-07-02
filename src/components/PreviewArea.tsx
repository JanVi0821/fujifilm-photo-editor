import { useEffect, useState, type RefObject } from 'react'

type PreviewAreaProps = {
  imageUrl: string | null
  imgRef: RefObject<HTMLImageElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  isProcessing: boolean
  eyedropperActive: boolean
  onImageLoad: () => void
  onEyedropperPick: (clientX: number, clientY: number) => void
}

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

  const handleCompareDown = () => setShowBefore(true)
  const handleCompareUp = () => setShowBefore(false)

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive || showBefore) return
    onEyedropperPick(e.clientX, e.clientY)
  }

  useEffect(() => {
    const img = imgRef.current
    if (!imageUrl || !img) return
    if (img.complete && img.naturalWidth > 0) {
      onImageLoad()
    }
  }, [imageUrl, imgRef, onImageLoad])

  const canvasCls =
    'block h-auto max-h-full w-auto max-w-full object-contain bg-black' +
    (eyedropperActive ? ' cursor-crosshair' : '')

  return (
    <main className="sticky top-0 z-20 order-1 flex h-[45vh] min-h-0 w-full min-w-0 shrink-0 items-center justify-center overflow-auto border-b border-border bg-app p-4 md:static md:z-auto md:order-0 md:h-auto md:flex-1 md:shrink md:border-b-0 md:p-6">
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
              onClick={handleCanvasClick}
            />
          </div>
        )}

        {isProcessing && (
          <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-[2px] bg-black/75 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg backdrop-blur-xs">
            Processing…
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
