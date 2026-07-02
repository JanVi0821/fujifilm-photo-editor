import { useCallback, useState } from 'react'

import { EditingPanel } from './components/EditingPanel'
import { LeftSidebar } from './components/LeftSidebar'
import { PreviewArea } from './components/PreviewArea'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { DEFAULT_IMAGE_ADJUSTMENTS } from './constants/adjustments'
import { DEFAULT_FILTER, type FilterId } from './constants/filters'
import { addHslTarget, createDefaultHslSettings } from './constants/hsl'
import { DEFAULT_PIPELINE_ORDER, type PipelineOrder } from './constants/pipeline'
import { useImageProcessing } from './hooks/useImageProcessing'
import { sampleCanvasPixel } from './image/color'

type ImageSource =
  | { kind: 'default' }
  | { kind: 'upload'; file: File }

function App() {
  const [imageSource, setImageSource] = useState<ImageSource>({ kind: 'default' })
  const [filter, setFilter] = useState<FilterId>(DEFAULT_FILTER)
  const [strength, setStrength] = useState(80)
  const [adjustments, setAdjustments] = useState(DEFAULT_IMAGE_ADJUSTMENTS)
  const [pipelineOrder, setPipelineOrder] = useState<PipelineOrder>(DEFAULT_PIPELINE_ORDER)
  const [eyedropperActive, setEyedropperActive] = useState(false)

  const {
    error,
    isProcessing,
    imageUrl,
    histogramBins,
    imgRef,
    canvasRef,
    onImageLoad,
    exportImage,
    setAdjusting,
    setError,
  } = useImageProcessing(imageSource, filter, strength, adjustments, pipelineOrder)

  const handleUpload = (file: File) => {
    setError(null)
    setImageSource({ kind: 'upload', file })
  }

  const handleExport = () => {
    exportImage().catch((e) => {
      setError(e instanceof Error ? e.message : String(e))
    })
  }

  const handleEyedropperPick = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const sample = sampleCanvasPixel(canvas, clientX, clientY)
      if (!sample) return

      setAdjustments((prev) => ({
        ...prev,
        hsl: addHslTarget(prev.hsl, sample.hue, sample.hex),
      }))
      setEyedropperActive(false)
    },
    [canvasRef],
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app">
      <TopBar
        onExport={handleExport}
        onUpload={handleUpload}
        canExport={!!imageUrl}
        isProcessing={isProcessing}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <LeftSidebar
          filter={filter}
          strength={strength}
          onFilterChange={setFilter}
          onStrengthChange={setStrength}
          onAdjustStart={() => setAdjusting(true)}
          onAdjustEnd={() => setAdjusting(false)}
        />

        <PreviewArea
          imageUrl={imageUrl}
          imgRef={imgRef}
          canvasRef={canvasRef}
          isProcessing={isProcessing}
          eyedropperActive={eyedropperActive}
          onImageLoad={onImageLoad}
          onEyedropperPick={handleEyedropperPick}
        />

        <EditingPanel
          adjustments={adjustments}
          histogramBins={histogramBins}
          pipelineOrder={pipelineOrder}
          onPipelineOrderChange={setPipelineOrder}
          onAdjustmentsChange={setAdjustments}
          eyedropperActive={eyedropperActive}
          onEyedropperActiveChange={setEyedropperActive}
          onAdjustStart={() => setAdjusting(true)}
          onAdjustEnd={() => setAdjusting(false)}
          onReset={() =>
            setAdjustments({
              ...DEFAULT_IMAGE_ADJUSTMENTS,
              hsl: createDefaultHslSettings(),
            })
          }
        />

        {/* Mobile: footer flows with the scrolling content instead of being pinned. */}
        <StatusBar
          filter={filter}
          isDefaultImage={imageSource.kind === 'default'}
          className="order-last md:hidden"
        />
      </div>

      {error && (
        <div className="fixed bottom-[52px] left-1/2 z-100 max-w-[480px] -translate-x-1/2 rounded border border-[#5c2020] bg-[#3d1515] px-5 py-2.5 text-center text-xs text-[#ff6b6b]">
          {error}
        </div>
      )}

      {/* Desktop: footer stays pinned at the bottom of the viewport. */}
      <StatusBar
        filter={filter}
        isDefaultImage={imageSource.kind === 'default'}
        className="hidden md:flex"
      />
    </div>
  )
}

export default App
