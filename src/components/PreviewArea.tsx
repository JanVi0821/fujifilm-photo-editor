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

  return (
    <main className="preview-area">
      <div className="preview-frame">
        {imageUrl && (
          <div className={`preview-stack ${eyedropperActive ? 'eyedropper-active' : ''}`}>
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              aria-hidden={!showBefore}
              className="render-canvas preview-source"
              style={{ display: showBefore ? 'block' : 'none' }}
              onLoad={onImageLoad}
            />
            <canvas
              ref={canvasRef}
              className="render-canvas preview-output"
              style={{ display: showBefore ? 'none' : 'block' }}
              onClick={handleCanvasClick}
            />
          </div>
        )}

        {isProcessing && (
          <div className="processing-badge">Processing…</div>
        )}

        <div className="preview-toolbar">
          <button
            className={`toolbar-btn ${showBefore ? 'active' : ''}`}
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
