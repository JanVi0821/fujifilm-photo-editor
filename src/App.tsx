import { useCallback, useState } from 'react'
import './App.css'

import { EditingPanel } from './components/EditingPanel'
import { LeftSidebar } from './components/LeftSidebar'
import { PreviewArea } from './components/PreviewArea'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { DEFAULT_IMAGE_ADJUSTMENTS } from './constants/adjustments'
import { DEFAULT_FILTER, type FilterId } from './constants/filters'
import { addHslTarget, createDefaultHslSettings } from './constants/hsl'
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
  } = useImageProcessing(imageSource, filter, strength, adjustments)

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
    <div className="app">
      <TopBar
        onExport={handleExport}
        onUpload={handleUpload}
        canExport={!!imageUrl}
        isProcessing={isProcessing}
      />

      <div className="workspace">
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
      </div>

      {error && <div className="error-toast">{error}</div>}

      <StatusBar filter={filter} isDefaultImage={imageSource.kind === 'default'} />
    </div>
  )
}

export default App
